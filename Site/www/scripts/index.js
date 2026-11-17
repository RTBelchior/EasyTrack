
(function () {
    "use strict";

    // ==========================================
    // CONFIGURAÇÕES
    // ==========================================

    var API_URL = "http://localhost:8080/api/measurements";
    var DEVICE_ID = "EASYTRACK-001";
    var FMAX = 195;
    var INTERVALO = 1000;

    var svgNS = "http://www.w3.org/2000/svg";

    var ZONES = [
        { id: "Z1", name: "Recuperação", hi: 0.6, c: "var(--z1)", hex: "#6f7f93" },
        { id: "Z2", name: "Leve", hi: 0.7, c: "var(--z2)", hex: "#3fb8af" },
        { id: "Z3", name: "Aeróbico", hi: 0.8, c: "var(--z3)", hex: "#7ed957" },
        { id: "Z4", name: "Limiar", hi: 0.9, c: "var(--z4)", hex: "#f5a524" },
        { id: "Z5", name: "Máximo", hi: 2, c: "var(--z5)", hex: "#ff4d4d" }
    ];

    // ==========================================
    // VARIÁVEIS
    // ==========================================

    var dadosReais = [];
    var hist = [];
    var running = true;
    var atualizacaoTimer = null;
    var ultimaMedicao = null;
    var primeiraCarga = true;
    var carregando = false;

    // Gráfico da partida
    var X0 = 44, X1 = 624;
    var Y0 = 22, Y1 = 250;
    var VMIN = 60, VMAX = 195;

    // Gráfico dos últimos 60 segundos
    var SX0 = 44, SX1 = 624;
    var SY0 = 8, SY1 = 172;
    var SMIN = 60, SMAX = 195;

    // ==========================================
    // FUNÇÕES AUXILIARES
    // ==========================================

    function zoneOf(bpm) {
        var p = bpm / FMAX;

        for (var i = 0; i < 5; i++) {
            if (p < ZONES[i].hi) return i;
        }

        return 4;
    }

    function el(name, attributes) {
        var element = document.createElementNS(svgNS, name);

        for (var key in attributes) {
            element.setAttribute(key, attributes[key]);
        }

        return element;
    }

    function sx(i, total) {
        return X0 + (total <= 1 ? 0 : i / (total - 1)) * (X1 - X0);
    }

    function sy(value) {
        return Y1 - (value - VMIN) / (VMAX - VMIN) * (Y1 - Y0);
    }

    function ssy(value) {
        return SY1 - (value - SMIN) / (SMAX - SMIN) * (SY1 - SY0);
    }

    function fmt(seconds) {
        var minutes = Math.floor(seconds / 60);
        var rest = seconds % 60;

        return minutes + ":" + (rest < 10 ? "0" : "") + rest;
    }

    function atualizarTexto(id, value) {
        var element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    }

    // ==========================================
    // CONFIGURAR GRÁFICO DA PARTIDA
    // ==========================================

    function configurarGrafico() {
        var bands = document.getElementById("cbands");
        var grid = document.getElementById("cgrid");

        if (!bands || !grid) return;

        bands.innerHTML = "";
        grid.innerHTML = "";

        [
            [0.9, 1, "#ff4d4d"],
            [0.8, 0.9, "#f5a524"],
            [0.7, 0.8, "#7ed957"],
            [0.6, 0.7, "#3fb8af"]
        ].forEach(function (b) {

            var top = Math.max(Y0, sy(b[1] * FMAX));
            var bottom = Math.min(Y1, sy(b[0] * FMAX));

            bands.appendChild(el("rect", {
                class: "zb",
                x: X0,
                y: top,
                width: X1 - X0,
                height: Math.max(0, bottom - top),
                fill: b[2]
            }));
        });

        [110, 130, 150, 170, 190].forEach(function (value) {

            grid.appendChild(el("line", {
                x1: X0,
                x2: X1,
                y1: sy(value),
                y2: sy(value)
            }));

            var text = el("text", {
                x: 36,
                y: sy(value) + 4,
                "text-anchor": "end"
            });

            text.textContent = value;
            grid.appendChild(text);
        });

        [0, 15, 30, 45, 60].forEach(function (minute) {

            var text = el("text", {
                x: X0 + minute / 67 * (X1 - X0),
                y: 276,
                "text-anchor": "middle"
            });

            text.textContent = minute + "'";
            grid.appendChild(text);
        });
    }

    // ==========================================
    // ATUALIZAR GRÁFICO DA PARTIDA
    // ==========================================

    function atualizarGraficoPartida() {

        if (dadosReais.length === 0) return;

        var points = dadosReais.map(function (measurement) {
            return measurement.heartRate;
        });

        var total = points.length;

        var d = points.map(function (value, index) {

            return (index === 0 ? "M" : "L") +
                sx(index, total).toFixed(1) + " " +
                sy(value).toFixed(1);

        }).join(" ");

        var line = document.getElementById("cline");
        var area = document.getElementById("carea");

        if (!line || !area) return;

        line.setAttribute("d", d);

        var lastX = sx(total - 1, total);

        area.setAttribute(
            "d",
            d + " L" + lastX + " " + Y1 +
            " L" + X0 + " " + Y1 + " Z"
        );

        ["cend", "cring"].forEach(function (id) {

            var element = document.getElementById(id);

            if (element) {
                element.setAttribute("cx", lastX);
                element.setAttribute("cy", sy(points[total - 1]));
            }

        });

        // Atualizar intervalo de minutos apresentado
        var label = document.querySelector(".panel-head .label");

        if (label) {
            label.textContent = total + " medições";
        }
    }

    // ==========================================
    // CONFIGURAR GRÁFICO DOS ÚLTIMOS 60 SEGUNDOS
    // ==========================================

    function configurarGrafico60s() {

        var grid = document.getElementById("sgrid");
        var target = document.getElementById("stz");

        if (!grid || !target) return;

        grid.innerHTML = "";

        [120, 150, 165, 195].forEach(function (value) {

            grid.appendChild(el("line", {
                class: value === 150 || value === 165 ? "tl" : "gl",
                x1: SX0,
                x2: SX1,
                y1: ssy(value),
                y2: ssy(value)
            }));

            var text = el("text", {
                x: 36,
                y: ssy(value) + 4,
                "text-anchor": "end"
            });

            text.textContent = value;
            grid.appendChild(text);
        });

        [
            ["-60 s", SX0],
            ["-30 s", (SX0 + SX1) / 2],
            ["agora", SX1]
        ].forEach(function (item) {

            var text = el("text", {
                x: item[1],
                y: 194,
                "text-anchor": item[1] === SX0
                    ? "start"
                    : item[1] === SX1
                        ? "end"
                        : "middle"
            });

            text.textContent = item[0];
            grid.appendChild(text);
        });

        target.setAttribute("y", ssy(165));
        target.setAttribute("height", ssy(150) - ssy(165));
    }

    // ==========================================
    // ATUALIZAR ÚLTIMOS 60 SEGUNDOS
    // ==========================================

    function atualizarGrafico60s() {

        var line = document.getElementById("sline");

        if (!line) return;

        var agora = Date.now();

        var ultimos = dadosReais.filter(function (measurement) {

            var hora = new Date(measurement.measuredAt).getTime();

            return agora - hora <= 60000 && agora - hora >= 0;

        });

        if (ultimos.length === 0) {
            line.setAttribute("points", "");
            return;
        }

        var points = ultimos.map(function (measurement, index) {

            var x = SX0 + index / Math.max(ultimos.length - 1, 1) * (SX1 - SX0);

            return x.toFixed(1) + "," +
                ssy(measurement.heartRate).toFixed(1);

        }).join(" ");

        line.setAttribute("points", points);
    }

    // ==========================================
    // ATUALIZAR INDICADORES
    // ==========================================

    function atualizarDashboard() {

        if (!ultimaMedicao) return;

        var bpm = ultimaMedicao.heartRate;
        var spo2 = ultimaMedicao.spo2;

        atualizarTexto("bpm", bpm);

        atualizarTexto("kSpo2", spo2);

        var zone = ZONES[zoneOf(bpm)];

        atualizarTexto(
            "zoneTxt",
            "Zona " + zone.id.slice(1) + " · " + zone.name.toLowerCase()
        );

        var pill = document.getElementById("zonePill");

        if (pill) {
            pill.style.setProperty("--c", zone.c);
        }

        atualizarTexto(
            "pctTxt",
            Math.round(bpm / FMAX * 100) + "% da FC máx."
        );

        // Média e máxima
        var soma = 0;
        var maximo = 0;

        dadosReais.forEach(function (measurement) {

            soma += measurement.heartRate;

            maximo = Math.max(
                maximo,
                measurement.heartRate
            );

        });

        atualizarTexto(
            "kAvg",
            Math.round(soma / dadosReais.length)
        );

        atualizarTexto("kMax", maximo);

        // Atualizar gráficos
        atualizarGraficoPartida();
        atualizarGrafico60s();

    }

    // ==========================================
    // LIGAR À API
    // ==========================================

    async function carregarDados() {

        if (!running || carregando) return;

        carregando = true;

        try {

            var response = await fetch(API_URL, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error("Erro HTTP: " + response.status);
            }

            var dados = await response.json();

            if (!Array.isArray(dados)) {
                throw new Error("Resposta inválida da API");
            }

            // Filtrar pulseira
            dados = dados.filter(function (measurement) {

                return measurement.deviceId === DEVICE_ID &&
                    Number.isFinite(Number(measurement.heartRate)) &&
                    Number(measurement.heartRate) > 0 &&
                    Number.isFinite(Number(measurement.spo2));

            });

            // Ordenar por data
            dados.sort(function (a, b) {

                return new Date(a.measuredAt) -
                    new Date(b.measuredAt);

            });

            if (dados.length === 0) {

                if (primeiraCarga) {
                    console.warn("Não existem medições para " + DEVICE_ID);
                }

                return;
            }

            dadosReais = dados;

            ultimaMedicao = dadosReais[dadosReais.length - 1];

            atualizarDashboard();

            primeiraCarga = false;

            console.log("EasyTrack atualizado:", ultimaMedicao);

        } catch (error) {

            console.error(
                "Erro ao comunicar com o Backend EasyTrack:",
                error
            );

        } finally {

            carregando = false;

        }
    }

    // ==========================================
    // EVENTOS DA PARTIDA
    // ==========================================

    function atualizarEventos() {

        var alerts = document.getElementById("alerts");

        if (!alerts || !ultimaMedicao) return;

        var bpm = ultimaMedicao.heartRate;
        var zone = ZONES[zoneOf(bpm)];

        var data = new Date(ultimaMedicao.measuredAt);

        var hora = data.toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });

        var events = [
            {
                c: zone.c,
                t: "Frequência cardíaca: " + bpm + " bpm",
                d: "Última medição recebida da pulseira " + DEVICE_ID,
                h: hora
            },
            {
                c: "var(--z3)",
                t: "Saturação de oxigénio: " + ultimaMedicao.spo2 + "%",
                d: "Valor recebido através do sensor.",
                h: hora
            }
        ];

        alerts.innerHTML = events.map(function (event, index) {

            return '<div class="alert" style="--c:' +
                event.c +
                ';animation-delay:' +
                (index * 90) +
                'ms">' +
                '<span class="dot"></span>' +
                '<div><b>' + event.t + '</b>' +
                '<p>' + event.d + '</p></div>' +
                '<time>' + event.h + '</time></div>';

        }).join("");
    }

    // ==========================================
    // ATUALIZAÇÃO AUTOMÁTICA
    // ==========================================

    function iniciarAtualizacao() {

        if (atualizacaoTimer) {
            clearInterval(atualizacaoTimer);
        }

        carregarDados();

        atualizacaoTimer = setInterval(function () {

            carregarDados();

        }, INTERVALO);
    }

    // ==========================================
    // BOTÃO PAUSAR / RETOMAR
    // ==========================================

    var pauseButton = document.getElementById("pause");

    if (pauseButton) {

        pauseButton.addEventListener("click", function () {

            running = !running;

            if (running) {

                this.textContent = "Pausar";

                iniciarAtualizacao();

            } else {

                this.textContent = "Retomar";

                if (atualizacaoTimer) {
                    clearInterval(atualizacaoTimer);
                    atualizacaoTimer = null;
                }

            }

        });
    }

    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================

    configurarGrafico();
    configurarGrafico60s();

    iniciarAtualizacao();

    // Atualizar eventos quando os dados mudarem
    var atualizarEventosOriginal = atualizarDashboard;

    atualizarDashboard = function () {
        atualizarEventosOriginal();
        atualizarEventos();
    };

})();
