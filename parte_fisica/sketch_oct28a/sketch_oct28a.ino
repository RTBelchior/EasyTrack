
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "DFRobot_BloodOxygen_S.h"

// ---------------- SENSOR ----------------

#define I2C_COMMUNICATION
#define I2C_ADDRESS 0x57

DFRobot_BloodOxygen_S_I2C sensor(&Wire, I2C_ADDRESS);

// ---------------- LED RGB ----------------

// Pinos do LED RGB
#define LED_R D0
#define LED_G D1
#define LED_B D2

// Limites de frequencia cardiaca (demonstracao)
#define FC_NORMAL 100
#define FC_ELEVADA 150

// ---------------- WIFI ----------------

const char* WIFI_SSID = "BELCHIOR";
const char* WIFI_PASSWORD = "rodrigoerita0";

// ---------------- BACKEND ----------------

const char* SERVER_URL =
  "http://192.168.68.52:8080/api/measurements";

const char* DEVICE_ID = "EASYTRACK-001";

// ---------------- MEDICOES ----------------

int ultimaFC = -1;
int ultimoSpO2 = -1;


// ---------------- CONTROLO LED ----------------

void desligarLED() {
  digitalWrite(LED_R, LOW);
  digitalWrite(LED_G, LOW);
  digitalWrite(LED_B, LOW);
}

void atualizarLED(int fc) {

  if (fc <= 0 || fc > 220) {
    desligarLED();
    Serial.println("LED: Apagado - sem leitura valida");
  }

  else if (fc < FC_NORMAL) {
    // Verde: frequencia normal
    digitalWrite(LED_R, LOW);
    digitalWrite(LED_G, HIGH);
    digitalWrite(LED_B, LOW);

    Serial.println("LED: VERDE - Frequencia normal");
  }

  else if (fc <= FC_ELEVADA) {
    // Amarelo: vermelho + verde
    digitalWrite(LED_R, HIGH);
    digitalWrite(LED_G, HIGH);
    digitalWrite(LED_B, LOW);

    Serial.println("LED: AMARELO - Frequencia elevada");
  }

  else {
    // Vermelho: frequencia muito elevada
    digitalWrite(LED_R, HIGH);
    digitalWrite(LED_G, LOW);
    digitalWrite(LED_B, LOW);

    Serial.println("LED: VERMELHO - Frequencia acima do limite");
  }
}


// ---------------- LIGAR WIFI ----------------

void ligarWiFi() {
  Serial.println("A ligar ao Wi-Fi...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tentativas = 0;

  while (WiFi.status() != WL_CONNECTED && tentativas < 30) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi ligado!");
    Serial.print("IP do ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nNao foi possivel ligar ao Wi-Fi.");
  }
}


// ---------------- ENVIAR DADOS ----------------

void enviarMedicao(int fc, int spo2) {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi desligado. A tentar ligar...");
    ligarWiFi();
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Medicao nao enviada.");
    return;
  }

  WiFiClient client;
  HTTPClient http;

  http.begin(client, SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  String json = "{";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"heartRate\":" + String(fc) + ",";
  json += "\"spo2\":" + String(spo2);
  json += "}";

  Serial.println("A enviar medicao...");
  Serial.println(json);

  int resposta = http.POST(json);

  if (resposta > 0) {
    Serial.print("Resposta do servidor: ");
    Serial.println(resposta);

    Serial.println(http.getString());

    if (resposta >= 200 && resposta < 300) {
      Serial.println("Medicao guardada com sucesso!");
    } else {
      Serial.println("Erro ao guardar a medicao.");
    }
  } else {
    Serial.print("Erro HTTP: ");
    Serial.println(http.errorToString(resposta));
  }

  http.end();
}


// ---------------- SETUP ----------------

void setup() {

  Serial.begin(115200);
  delay(1000);

  // Inicializar LED RGB
  pinMode(LED_R, OUTPUT);
  pinMode(LED_G, OUTPUT);
  pinMode(LED_B, OUTPUT);

  desligarLED();

  Serial.println("LED RGB iniciado!");

  // Inicializar comunicacao I2C
  Wire.begin(D4, D5);

  Serial.println("A iniciar SEN0344...");

  while (!sensor.begin()) {
    Serial.println("Sensor nao encontrado!");
    delay(2000);
  }

  Serial.println("Sensor iniciado!");

  sensor.sensorStartCollect();

  ligarWiFi();

  Serial.println("Coloca o dedo e mantem-no imovel.");

  delay(4000);
}


// ---------------- LOOP ----------------

void loop() {

  sensor.getHeartbeatSPO2();

  int fc = sensor._sHeartbeatSPO2.Heartbeat;
  int spo2 = sensor._sHeartbeatSPO2.SPO2;

  Serial.println("\n--- MEDICAO ---");

  bool fcValida = (fc > 0 && fc <= 220);
  bool spo2Valido = (spo2 >= 70 && spo2 <= 100);

  // -------- FREQUENCIA CARDIACA --------

  if (fcValida) {
    ultimaFC = fc;

    Serial.print("Frequencia cardiaca: ");
    Serial.print(fc);
    Serial.println(" BPM");

    // Atualizar LED de acordo com a FC
    atualizarLED(fc);

  } else {
    Serial.println("Frequencia cardiaca: Sem leitura valida");

    desligarLED();
  }

  // -------- SPO2 --------

  if (spo2Valido) {
    ultimoSpO2 = spo2;

    Serial.print("SpO2: ");
    Serial.print(spo2);
    Serial.println(" %");
  } else {
    Serial.println("SpO2: Sem leitura valida");
  }

  Serial.println("---------------");

  // Enviar apenas quando ambos os valores sao validos
  if (fcValida && spo2Valido) {
    enviarMedicao(fc, spo2);
  } else {
    Serial.println("Medicao nao enviada: valores invalidos.");
  }

  delay(4000);
}
