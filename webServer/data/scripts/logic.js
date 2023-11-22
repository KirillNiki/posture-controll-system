
const expectedWeightPercents = [9.83, 15.95, 15.56, 12.15, 11.37, 11.48, 6.02, 11.6, 3.48, 2.57];
const colorStates = { greenState: 'greenState', redState: 'redState', yellowState: 'yellowState' };
const postureSuggestions = { back: 'back', left: 'left', right: 'right', };
const State = { correct: 'correct', wrong: 'wrong' };

let trainStarted = false;
let stand = false;
let trainCounter = 0;

let maxSittingTime = 1000 * 60 * 40;



function CountRowValues() {
  let array = [];
  let sensorsInRowValues = 0;
  let val = 0;

  for (let i = 0; i < data.weights.length; i++) {
    sensorsInRowValues += data.weights[i];

    if ((i + 1) % 4 === 0 || i === data.weights.length - 1) {
      val = 0;
      if (data.allValuesSum != 0)
        val = sensorsInRowValues / data.valuePerPersent;
      sensorsInRowValues = 0;
      array.push(Math.round(val));
    }
  }
  ChangeRowValues(array.reverse());
}



function CountSensorTable() {
  let AllCells = document.getElementsByClassName('tableDiv');
  for (let i = AllCells.length - 1; i >= 0; i--) {
    AllCells[i].classList.remove(colorStates.greenState, colorStates.yellowState, colorStates.redState);

    if (data.allValuesSum === 0 || (data.weights[i] / data.valuePerPersent) < 5) {
      AllCells[i].classList.add(colorStates.greenState);
    } else if ((data.weights[i] / data.valuePerPersent) > 15) {
      AllCells[i].classList.add(colorStates.redState);
    } else {
      AllCells[i].classList.add(colorStates.yellowState);
    }

    let textObj = AllCells[i].getElementsByTagName('p')[0];
    textObj.innerHTML = data.weights[i];
  }
}



function CountCurrentState() {
  let DeltaMatrix = [0, 0, 0, 0];
  let cerrentWeightDeltaProcents = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < data.weights.length; i++)
    cerrentWeightDeltaProcents[i] = (data.weights[i] / data.valuePerPersent) - expectedWeightPercents[i];

  //cerrentWeightDeltaProcents matrix pooling(4 squears)
  for (let i = 0; i < 4; i++) {
    let avarageDelta = 0;
    let firstIndex = i * 2;

    if (i === 2 || i === 3) {
      avarageDelta += cerrentWeightDeltaProcents[firstIndex];
      avarageDelta += cerrentWeightDeltaProcents[firstIndex + 1];
      avarageDelta += cerrentWeightDeltaProcents[firstIndex + 2 + firstIndex % 2];

      avarageDelta = avarageDelta / 3;
      DeltaMatrix[i] = avarageDelta;
      continue;
    }
    for (let j = 0; j < 2; j++) {
      avarageDelta += cerrentWeightDeltaProcents[firstIndex + j];
      avarageDelta += cerrentWeightDeltaProcents[firstIndex + j + 4];
    }
    avarageDelta = avarageDelta / 4;
    DeltaMatrix[i] = avarageDelta;
  }

  let currentSagest = '';
  let currentState = State.correct;
  if (DeltaMatrix[2] > 7. || DeltaMatrix[3] > 7) currentSagest = postureSuggestions.back;
  else if (DeltaMatrix[0] > 7. || DeltaMatrix[2] > 7) currentSagest = postureSuggestions.left;
  else if (DeltaMatrix[1] > 7. || DeltaMatrix[3] > 7) currentSagest = postureSuggestions.right;

  if (currentSagest != '') currentState = State.wrong;
  CangeStateValues(currentState, currentSagest);
}



function CountTimesADayHour() {
  let hourCount = 0;
  let dayCount = 0;

  for (let i = 0; i < data.infoData.length; i++) {

    let currentHour = date.getHours();
    console.log(Number(data.infoData[i].time.slice(7, 9)))

    if (currentHour - Number(data.infoData[i].time.slice(7, 9)) <= 1)
      hourCount++;
    if (data.infoData[i].time.length > 0)
      dayCount++;
  }
  ChangingTimesDayHour(dayCount, hourCount);
}



function CountMinMaxVals() {
  let maxVal = Number(data.infoData[0].weight);
  let minVal = Number(data.infoData[0].weight);
  let lastMin = minVal;

  for (let i = 1; i < data.infoData.length; i++) {
    maxVal = Math.max(maxVal, data.infoData[i].weight);

    minVal = Math.min(minVal, data.infoData[i].weight);
    if (lastMin !== 0 && minVal === 0) {
      minVal = lastMin
    }
  }
  ChangingMinMaxVals(maxVal, minVal);
}



async function Train() {
  let isTestTrain = document.URL.includes('train');
  let trainObj = document.getElementById('train');
  let trainTextObj = document.getElementById('trainText');
  let timeTextObj = document.getElementById('timeText');

  let SittingCounter = 0;
  let isSitting = false;
  for (let i = 0; i < data.weights.length; i++) {
    if (data.weights[i] > 400)
      SittingCounter++;

    if (SittingCounter >= 4) {
      isSitting = true;
      break;
    }
  }
  let sittingTimer = data.sittingTimer;

  if (((isTestTrain && (Date.now() - sittingTimer >= 30)) || Date.now() - sittingTimer >= maxSittingTime) && !trainStarted) {
    trainObj.classList.remove('hidden');
    trainTextObj.innerHTML = 'train started';
    trainStarted = true;
    stand = true;

    await fetch(`train`);
    sittingTimer = 0;
  }

  let time = '';
  if (trainStarted) {
    time = 0;
  } else if (isTestTrain) {
    time = Math.round((30 - (Date.now() - sittingTimer)) / 1000);
  } else {
    time = Math.round((maxSittingTime - (Date.now() - sittingTimer)) / 1000);
  }
  timeTextObj.innerHTML = `time before trianing(sec): ${time}`;


  if (stand && trainCounter < 6 && trainStarted) {
    trainTextObj.innerHTML = '.stand.';
    if (!isSitting) {
      trainCounter++;
      stand = false;
    }
  } else if (!stand && trainCounter < 6 && trainStarted) {
    trainTextObj.innerHTML = '. sit .';
    if (isSitting) {
      trainCounter++;
      stand = true;
    }
  }

  if (trainCounter == 6 || (!isSitting && !trainStarted)) {
    trainStarted = false;
    trainCounter = 0;
    stand = true;

    trainObj.classList.add('hidden');
  }
  if (trainCounter == 6) {
    await fetch(`train`);
  }
}




function TwoMaxAvarage() {
  let prevMax = data.weights[0];
  let Max = data.weights[1];

  for (let i = 2; i < data.weights.length; i++) {
    let val = data.weights[i];

    if (Max < val) {
      prevMax = Max;
      Max = val;
    } else if (prevMax < val) {
      prevMax = val;
    } else
      continue;
  }
  return (prevMax + Max) / 2;
}
