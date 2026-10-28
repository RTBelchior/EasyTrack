
/*
  Sensor LCUP + ESP32-C6
  Estimativa experimental de BPM
*/

const int SENSOR_PIN = 0;

const unsigned long MIN_INTERVAL = 300;
const unsigned long MAX_INTERVAL = 1500;

float linhaBase = 0;
float sinalFiltrado = 0;
float amplitude = 0;

bool iniciado = false;
bool acima = false;

unsigned long ultimoPico = 0;
unsigned long ultimaSaida = 0;

unsigned long intervalos[5];
int numeroIntervalos = 0;
int indiceIntervalo = 0;

int bpm = 0;
int ultimoADC = 0;

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  delay(1000);

  Serial.println("LCUP - ESP32-C6");
  Serial.println("Coloca o dedo e mantem-no imovel.");
}

void loop() {
  unsigned long agora = millis();
  int adc = analogRead(SENSOR_PIN);

  if (!iniciado) {
    linhaBase = adc;
    ultimoADC = adc;
    iniciado = true;
  }

  // Rejeita alteracoes bruscas causadas por movimento
  if (abs(adc - ultimoADC) > 350) {
    linhaBase = adc;
    sinalFiltrado = 0;
    amplitude = 0;
    acima = false;
    ultimoPico = 0;
    numeroIntervalos = 0;
    bpm = 0;
    ultimoADC = adc;
    delay(5);
    return;
  }

  ultimoADC = adc;

  // Remove a componente lenta
  linhaBase = 0.99 * linhaBase + 0.01 * adc;
  float sinal = adc - linhaBase;

  // Filtro do sinal
  sinalFiltrado = 0.8 * sinalFiltrado + 0.2 * sinal;

  // Amplitude adaptativa
  amplitude = 0.98 * amplitude +
              0.02 * abs((int)sinalFiltrado);

  float limiar = max(8.0f, amplitude * 0.7f);

  // Deteta uma subida acima do limiar
  if (!acima && sinalFiltrado > limiar) {
    acima = true;

    if (ultimoPico != 0) {
      unsigned long intervalo = agora - ultimoPico;

      if (intervalo >= MIN_INTERVAL &&
          intervalo <= MAX_INTERVAL) {

        intervalos[indiceIntervalo] = intervalo;
        indiceIntervalo = (indiceIntervalo + 1) % 5;

        if (numeroIntervalos < 5) {
          numeroIntervalos++;
        }

        // Só calcula quando há pelo menos 3 intervalos
        if (numeroIntervalos >= 3) {
          unsigned long soma = 0;

          for (int i = 0; i < numeroIntervalos; i++) {
            soma += intervalos[i];
          }

          unsigned long mediaIntervalo = soma / numeroIntervalos;
          bpm = 60000 / mediaIntervalo;
        }
      }
    }

    ultimoPico = agora;
  }

  if (sinalFiltrado < limiar * 0.25f) {
    acima = false;
  }

  if (agora - ultimaSaida >= 1000) {
    ultimaSaida = agora;

    Serial.print("ADC=");
    Serial.print(adc);
    Serial.print(" | Sinal=");
    Serial.print(sinalFiltrado, 1);
    Serial.print(" | BPM=");

    if (ultimoPico == 0 || agora - ultimoPico > 2500) {
      Serial.println("--");
      bpm = 0;
    } else if (numeroIntervalos >= 3) {
      Serial.println(bpm);
    } else {
      Serial.println("a estabilizar");
    }
  }

  delay(5);
}
