
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

// === Função auxiliar para criar o delay (pausa) no código ===
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// === 1. DISPARAR GRITO (Com repetição a cada 4 segundos) ===
// === 1. DISPARAR GRITO (Corrigido para validar Status e Pagamento) ===
exports.enviarGritoNovoPedido = onDocumentWritten("pedidos/{pedidoId}", async (event) => {
    // Se o documento foi deletado, ignora
    if (!event.data.after.exists) return;

    const novoPedido = event.data.after.data();
    const dadosAntigos = event.data.before.exists ? event.data.before.data() : null;
    const pedidoId = event.params.pedidoId;

    // --- NOVA LÓGICA DE VALIDAÇÃO ---
    // 1. O status deve ser "pendente"
    // 2. O pagamento deve estar liberado (pago via app ou dinheiro na entrega)
    const ehPendente = novoPedido.status === "pendente";
    const ehPagamentoLiberado = ["pago_pelo_app", "cobrar_no_local"].includes(novoPedido.status_pagamento);
    
    // Verifica se houve uma mudança relevante: agora é pendente e antes não era, ou o pagamento foi confirmado agora
    const statusMudouParaLiberado = ehPendente && ehPagamentoLiberado && 
                                   (!dadosAntigos || dadosAntigos.status !== "pendente" || !["pago_pelo_app", "cobrar_no_local"].includes(dadosAntigos.status_pagamento));

    if (!statusMudouParaLiberado) return; // Interrompe se não atender aos requisitos
    // --------------------------------

    console.log(`Iniciando ciclo de notificações para o pedido liberado: ${pedidoId}`);

    const valorMotorista = novoPedido.valor_motorista || (Number(novoPedido.valor || 0) * 0.80);
    const valorFormatado = Number(valorMotorista).toFixed(2).replace('.', ',');

    try {
        const motoristasRef = admin.firestore().collection("usuarios");
        const snapshotMotoristas = await motoristasRef
            .where("notificacoesAtivas", "==", true)
            .where("tipo", "in", ["motorista", "entregador", "admin"])
            .get();

        const tokens = [];
        snapshotMotoristas.forEach(doc => {
            const dados = doc.data();
            const tokenParaEnvio = dados.fcmToken || dados.expoPushToken;
            if (tokenParaEnvio) {
                tokens.push(tokenParaEnvio);
            }
        });

        if (tokens.length === 0) {
            console.log("Nenhum motorista online disponível.");
            return;
        }

        const mensagemFCM = {
            tokens: tokens,
            notification: {
                title: `🚨 NOVA CORRIDA: R$ ${valorFormatado}`,
                body: `📍 Coleta: ${novoPedido.endereco_coleta}\n🏁 Entrega: ${novoPedido.endereco_entrega}`
            },
            android: {
                priority: "high",
                notification: {
                    channelId: "corrida_urgente",
                    sound: "default"
                }
            },
            data: {
                tipo: "nova_corrida",
                pedidoId: String(pedidoId),
                acao: "abrir_tela_cheia",
                valor_motorista: String(valorMotorista),
                metodo_pagamento: String(novoPedido.metodo_pagamento || ""),
                status_pagamento: String(novoPedido.status_pagamento || "pendente")
            }
        };

        // =========================================================
        // 🔄 LOOP DE NOTIFICAÇÕES (Até 3 vezes com intervalo de 4s)
        // =========================================================
        const maxTentativas = 3;
        const intervaloMs = 4000; // 4 segundos

        for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
            
            // A partir da 2ª tentativa, verifica se o pedido JÁ FOI ACEITO
            if (tentativa > 1) {
                const docAtual = await admin.firestore().collection("pedidos").doc(pedidoId).get();
                if (!docAtual.exists || docAtual.data().status !== "pendente") {
                    console.log(`✅ Pedido ${pedidoId} já aceito. Cancelando disparos restantes.`);
                    break;
                }
            }

            console.log(`Disparando FCM (Tentativa ${tentativa}/${maxTentativas})...`);
            await admin.messaging().sendEachForMulticast(mensagemFCM);

            if (tentativa < maxTentativas) {
                await sleep(intervaloMs);
            }
        }
    } catch (error) {
        console.error("Erro ao enviar notificações FCM:", error);
    }
});

// === 2. GERAR LINK INFINITEPAY ===
exports.gerarLinkPagamento = onRequest({ cors: true }, async (req, res) => {
    const { pedidoId, valor, email, nome, telefone, document, descricao, cep, rua, bairro, numero, complemento, urlRetorno } = req.body;

    try {
        const foneLimpo = (telefone || "").replace(/\D/g, "");
        let foneFormatado;
        if (foneLimpo.length >= 10) {
            foneFormatado = foneLimpo.startsWith('55') ? `+${foneLimpo}` : `+55${foneLimpo}`;
        }

        const cepLimpo = (cep || "").replace(/\D/g, "");
        const docLimpo = (document || "").replace(/\D/g, "");

        const payload = {
            handle: "flash-entregas-br",
            order_nsu: pedidoId,
            items: [{
                description: descricao || "Flash Entrega.br",
                price: Math.round(valor * 100),
                quantity: 1
            }],
            customer: {
                name: nome || "Cliente Flash",
                email: email || "cliente@email.com",
                document_number: docLimpo 
            },
            webhook_url: "https://webhookinfinitepay-cuihbvkkmq-uc.a.run.app?token=FLASH_SECRETO_9988",
            redirect_url: urlRetorno || "https://flash-entregas-br.web.app/sucesso"
        };

        if (foneFormatado) payload.customer.phone_number = foneFormatado;

        if (cepLimpo && cepLimpo.length === 8) {
            payload.address = {
                cep: cepLimpo,
                street: rua || "Não informado",
                neighborhood: bairro || "Não informado",
                number: numero || "S/N",
                complement: complemento || ""
            };
        }

        const response = await axios.post("https://api.infinitepay.io/invoices/public/checkout/links", payload);
        res.json({ url: response.data.url });

    } catch (error) {
        console.error("ERRO INFINITEPAY:", JSON.stringify(error.response?.data || error.message));
        res.status(500).json({ erro: "Erro na InfinitePay", detalhes: error.response?.data || error.message });
    }
});

// === 3. WEBHOOK INFINITEPAY ===
exports.webhookInfinitePay = onRequest({ cors: true }, async (req, res) => {
    // 🛡️ SEGURANÇA: Verifica se o token na URL é o correto
    const token = req.query.token;
    if (token !== "FLASH_SECRETO_9988") {
        console.warn("🚨 Tentativa de acesso não autorizado ao Webhook!");
        return res.status(401).send("Acesso negado");
    }

    const dados = req.body;
    console.log("💥 [WEBHOOK RECEBIDO]:", JSON.stringify(dados));

    const payloadTransacao = dados.data ? dados.data : dados;
    const pedidoId = payloadTransacao.order_nsu || payloadTransacao.reference_id || dados.order_nsu;
    
    // Validação robusta de pagamento
    const statusPago = !!dados.transaction_nsu && (dados.paid_amount > 0);

    if (pedidoId && statusPago) {
        try {
            // === ROTA 1: RECARGA DE CARTEIRA ===
            if (pedidoId.startsWith("RECARGA_")) {
                const partes = pedidoId.split("_");
                const uidCliente = partes[1];
                const valorRecarregado = dados.paid_amount / 100;

                const userRef = admin.firestore().collection("usuarios").doc(uidCliente);
                
                await userRef.update({
                    saldo_carteira: admin.firestore.FieldValue.increment(valorRecarregado)
                });

                await admin.firestore().collection("recargas_carteira").doc(pedidoId).set({
                    cliente_uid: uidCliente,
                    valor: valorRecarregado,
                    data: admin.firestore.FieldValue.serverTimestamp(),
                    transaction_id: dados.transaction_nsu
                });

                console.log(`💰 RECARGA SUCESSO! R$ ${valorRecarregado} para ${uidCliente}.`);
                return res.status(200).send("OK");
            }

            // === ROTA 2: PAGAMENTO DE CORRIDA NORMAL ===
            const pedidoDoc = admin.firestore().collection("pedidos").doc(pedidoId);
            const snap = await pedidoDoc.get();

            if (snap.exists && snap.data().status_pagamento !== "pago_pelo_app") {
                await pedidoDoc.update({
                    status: "pendente", 
                    status_pagamento: "pago_pelo_app",
                    pago_em: admin.firestore.FieldValue.serverTimestamp(),
                    transaction_id: dados.transaction_nsu
                });
                console.log(`✅ Pedido ${pedidoId} aprovado e liberado!`);
            }
            res.status(200).send("OK");

        } catch (error) {
            console.error("❌ Erro no Firebase:", error);
            res.status(500).send("Erro interno");
        }
    } else {
        res.status(200).send("Recebido.");
    }
});