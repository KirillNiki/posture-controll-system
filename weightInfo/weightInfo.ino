#include "SoftwareSerial.h"

//                  1,  2,  3,  4,  7,  5,  6, 10,  8,  9
int allPins[10] = {13, 12, 14, 27, 33, 26, 25, 34, 32, 35};
int allVals[10];
String allData = "";
bool isAsked = false;

SoftwareSerial mySerial(16, 17);
void setup() {
  mySerial.begin(9600, SWSERIAL_8N1);
  Serial.begin(9600);
}

void loop() {  
  if (mySerial.available() && !isAsked) {
    String ask = mySerial.readString();
    Serial.println("ask"+ String(ask));
    
    if (ask == "give")
      isAsked = true;
  }


  if (isAsked)
  {
    int sum = 0;
    allData = "";
    
    for (int i = 0; i < 10; i++) 
    {
      int val = analogRead(allPins[i]);
      Serial.print("val:  "+ String(val) +"  ");
      allVals[i] = max(1.8567*val - 281.4006, 0.);
      //pow(2.72, 6.3288 + 0.0009*val) - 562;
      
      Serial.println(allVals[i]);
      allData += String(allVals[i]) + ",";
      sum += allVals[i];
    }

    Serial.println("allData:   "+ String(allData));
    float perPercent = sum / 100.;
    for (int i = 0; i < 10; i++) {
      Serial.print(String(allVals[i] / perPercent) +", ");
    }
    Serial.println();

    int strLen = allData.length();
    Serial.println(strLen);
    char* pointer = new char[strLen + 1];
    
    allData.toCharArray(pointer, strLen + 1);
    pointer[strLen] = 0;
    Serial.println("allData:   "+ String(pointer));
    
    mySerial.write(pointer, strlen(pointer));
    delete[] pointer;
    isAsked = false;
  }
  delay(50);
}
