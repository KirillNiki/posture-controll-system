
#include "ESPAsyncWebServer.h"
#include "ArduinoJson.h"
#include "WiFi.h"
#include "SPIFFS.h"
#include "SoftwareSerial.h"
#include "iarduino_RTC.h"


iarduino_RTC watch(RTC_DS1302, 2, 0, 4);

const char* ssid = "posture-controll-system";
const char* password = "kirill123";
AsyncWebServer server(80);

int weightValues[10] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
SoftwareSerial mySerial(16, 17);
int lastWeight = 0;
float currentWeight = 0;

int factor = 34;
int readingTimer = 0;
int writingTimer = 0;
bool synchronized = false;

bool isTrain = false;
int sittingTimer = 0;
int nonSittingTimer = 0;
int maxNonSittingTime = 5;

struct infoFileCell {
  char specificTime[13];
  float weightAtTime;
};
struct infoFileStruct {
  int currentIndex;
  infoFileCell InfoFileData[12];
};
infoFileStruct infoFile;


const int weightMesureTime = 60 * 1000;

  
void setup() {
  sittingTimer = watch.gettimeUnix();
  
  Serial.println("start");
  Serial.begin(9600);
  SPIFFS.begin(true);
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid, password);
  Serial.println(WiFi.softAPIP());

  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(SPIFFS, "/index.html");
  });

  server.on("/watchTime", HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL, 
    [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
      DynamicJsonBuffer jsonBuffer;
      JsonObject& root = jsonBuffer.parseObject((const char*)data);
      
      if (root.success() && root.containsKey("time") && !synchronized) {
        ChangingTime(root["time"].asString());
        synchronized = true;
      }
      request->send(200);
  });
  
  server.on("/data", HTTP_GET, [](AsyncWebServerRequest *request) {
    Serial.println("sending data >>>>>>>>>>>>>>>>");
    AsyncResponseStream *response = request->beginResponseStream("application/json");
    DynamicJsonBuffer jsonBuffer;
    JsonObject& root = jsonBuffer.createObject();
    JsonArray& weights = jsonBuffer.createArray();
    JsonArray& infoData = jsonBuffer.createArray();

    for (int i = 0; i < 10; i++) {
      weights.add(weightValues[i]);
    }
    for (int i = 0; i < 12; i++) {
      JsonObject& info = jsonBuffer.createObject();
      info["time"] = infoFile.InfoFileData[i].specificTime;
      info["weight"] = infoFile.InfoFileData[i].weightAtTime;
      infoData.add(info);
    }
    root["weights"] = weights;
    root["infoData"] = infoData;
    root["sittingTimer"] = String(sittingTimer - (9 * 60 * 60)) + "000";
    
    root.printTo(*response);
    request->send(response);
  });

  server.on("/train", HTTP_GET, [](AsyncWebServerRequest *request) {
    isTrain = !isTrain;
    if (!isTrain) {
      sittingTimer = watch.gettimeUnix();
    }
    request->send(SPIFFS, "/index.html");
  });
  
  server.on("/scripts/app.js", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(SPIFFS, "/scripts/app.js");
  });

  server.on("/scripts/logic.js", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(SPIFFS, "/scripts/logic.js");
  });
  
  server.on("/style.css", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(SPIFFS, "/style.css");
  });
  
  server.begin();
  watch.begin();
  mySerial.begin(9600, SWSERIAL_8N1);
  
  if (sizeof (infoFile) > 0) {
    memset(&infoFile, 0, sizeof (infoFile));
    InfoFileReading ();
  }
}


void loop() {
  if (millis() - readingTimer > 2000) {
    Serial.println(watch.gettime("d-m-Y, H:i:s, D"));
    currentWeight = TwoMaxAvarage (weightValues) * factor;
    
    AnalogDataRead();
    SittingTimerSetup();
    readingTimer = millis();
  }

  if (millis() - writingTimer > weightMesureTime && currentWeight != 0) {
      InfoFileWriting();
      writingTimer = millis();
  }
  delay(50);
}



void AnalogDataRead() {
  Serial.println("reading data >>>>>>");
  mySerial.print(String("give"));
  while (!mySerial.available()) {}
  
  int arrayCounter = 0;
  String currentVal = "";
  int dataSize = mySerial.available();
  char* myDataPointer = new char[dataSize + 1];

  delay(10);
  mySerial.readBytes(myDataPointer, dataSize);
  myDataPointer[dataSize] = 0;
        
  for (int i = 0; i < dataSize; i++) {
    if (myDataPointer[i] != ',') {
      currentVal += String(myDataPointer[i]);
      
    } else {
      weightValues[arrayCounter] = currentVal.toInt();
      arrayCounter++;
      currentVal = "";
    }
  }
  delete[] myDataPointer;
}


void SittingTimerSetup() { 
  if (!isTrain) {
    int SittingCounter = 0;
    bool isSitting = false;
    
    for (int i = 0; i < 10; i++) {
      if (weightValues[i] > 400) {
        SittingCounter++;
      }
      
      if (SittingCounter >= 4) {
        isSitting = true;
        break;
      }
    } 
    if (!isSitting) {
      if (watch.gettimeUnix() - nonSittingTimer >= maxNonSittingTime) {
        sittingTimer = watch.gettimeUnix();
      }
    } else {
      nonSittingTimer = watch.gettimeUnix();
    }
  }
}


float TwoMaxAvarage (int Array[]) {
  int prevMax = Array[0];
  int Max = Array[1];
  
  for (int i = 2; i < sizeof(Array)/4; i++) {
    if (Max < Array[i]) {
      prevMax = Max;
      Max = Array[i];
    
    } else if (prevMax < Array[i]) {
        prevMax = Array[i];
    } else continue;
  }
  return (prevMax + Max) / 2.;
}



void ChangingTime(String currentTimeString) {
    double currentTime = currentTimeString.toDouble();
    if (abs(round(currentTime / 1000) - watch.gettimeUnix()) > 20) {
      watch.settimeUnix(round(currentTime / 1000));
      watch.settime(-1,-1, (watch.Hours + 9));
    }
}



void InfoFileWriting() {
  Serial.println("file writing >>>>>>");
  if (abs(currentWeight - lastWeight) > 500) {

    if (infoFile.currentIndex == 12)
      infoFile.currentIndex = 0;
    
    char* timeStr = new char[13]; //12 chars
    memset(timeStr, 0, sizeof (timeStr));
    StringToChar (timeStr, String(watch.gettime("d-M H:i")));

    memcpy (&infoFile.InfoFileData[infoFile.currentIndex].specificTime, timeStr, strlen(timeStr));
    delete[] timeStr;
    
    infoFile.InfoFileData[infoFile.currentIndex].weightAtTime = currentWeight;
    infoFile.currentIndex++;

    SPIFFS.remove("/myinfo.txt");
    File writeFile = SPIFFS.open("/myinfo.txt", FILE_WRITE);
    if (writeFile.write((byte*)&infoFile, sizeof(infoFile)))
      Serial.println("written");
    else 
      Serial.println("written failed");
    writeFile.close();
    lastWeight = currentWeight;
  }
  Serial.println("writing is ended");
}


void InfoFileReading() {
  File readFile = SPIFFS.open("/myinfo.txt", FILE_READ);
  long fsize = readFile.size();
  
  readFile.readBytes((char*)&infoFile, fsize);
  readFile.close();
}


void StringToChar(char* Array, String string) {
  for (int i = 0; i < string.length(); i++) {
    Array[i] = string[i];
  }
  Array[string.length()] = 0;
}
