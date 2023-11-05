
const ButtonState = { enter: 'enter', exit: 'exit' };
const factor = 34;
let isWMMode = false;


let date = new Date();
fetch('watchTime', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        "time": date.getTime(),
    }),
}).catch((error) => {
    console.log(error);
});


let data; // { weights, infoData, allValuesSum, valuePerPersent }
async function getData() {
    let dataHeaders = await fetch(`data`);
    data = await dataHeaders.json();

    data.allValuesSum = 0;
    for (let i = 0; i < data.weights.length; i++) {
        data.allValuesSum += parseInt(data.weights[i]);
    }
    data.valuePerPersent = data.allValuesSum / 100;
    data.currentWeight = TwoMaxAvarage() * factor;
}

setInterval(async () => {
    await getData();

    CountRowValues();
    CountSensorTable();
    CountCurrentState();

    CountTimesADayHour();
    CountMinMaxVals();
    ChartChanging();

    ChangeCurrentWeight();
    await Train();
}, 2000);


let button = document.getElementById('button');
button.addEventListener('click', (event) => CountCurrentWeight(event));





function CountCurrentWeight(event) {

    let button = document.getElementById('buttonText');
    let mesureWeight = document.getElementById('currentWeight');
    let buttonContext = '';

    if (!isWMMode) {
        mesureWeight.classList.remove('hidden');
        buttonContext = ButtonState.exit;
        isWMMode = true;
    } else {
        mesureWeight.classList.add('hidden');
        buttonContext = ButtonState.enter;
        isWMMode = false;
    }
    button.innerHTML = `press to ${buttonContext} WMmode(weight measurement)`;
    ChangeCurrentWeight();
}



function ChangeCurrentWeight() {
    let yourWeight = document.getElementById('yourWeight');
    let yourWeghtContext = '';

    if (isWMMode) {
        yourWeghtContext = data.currentWeight;
    } else {
        yourWeghtContext = 'enter WMmode';
    }
    yourWeight.innerHTML = `your weight(~g): ${yourWeghtContext}`;
}




function ChangeRowValues(array = [0, 0, 0]) {
    const canvas = document.getElementById("sensorTable");
    const sensorTableCanvas = canvas.getContext("2d");
    sensorTableCanvas.font = `50px serif`;
    sensorTableCanvas.fillText("weight distribution", 20, 50);
    sensorTableCanvas.font = `40px serif`;

    sensorTableCanvas.fillText("weight, %", 100, 100);
    for (let i = 0; i < array.length; i++) {
        sensorTableCanvas.clearRect(20, 120 + (i * 110), canvas.width, 40);
        sensorTableCanvas.fillText(`row${array.length - i}: ${array[i]}`, 20, 160 + (i * 110));
    }
}



function CangeStateValues(currentState, currentSuggest) {
    const canvas = document.getElementById("yoursState");
    const yoursStateCanvas = canvas.getContext("2d");
    yoursStateCanvas.clearRect(0, 0, canvas.width, canvas.height);

    yoursStateCanvas.font = `50px serif`;
    yoursStateCanvas.fillText("your posture: ", 40, 40);

    yoursStateCanvas.font = `40px serif`;
    yoursStateCanvas.fillText(`posture: ${currentState}`, 40, 105);
    yoursStateCanvas.fillText(`change posture: ${currentSuggest}`, 40, 155);
}



function ChangingTimesDayHour(timesAday, timeAhour) {
    const canvas = document.getElementById("history1");
    const historyCanvas1 = canvas.getContext("2d");
    historyCanvas1.clearRect(0, 0, canvas.width, canvas.height);

    historyCanvas1.font = `40px serif`;
    historyCanvas1.fillText("number of times per:", 10, 60);
    historyCanvas1.fillText(`-day ${timesAday}`, 30, 120);
    historyCanvas1.fillText(`-hour ${timeAhour}`, 30, 160);
}



function ChangingMinMaxVals(maxVal, minVal) {
    const canvas = document.getElementById("history2");
    const historyCanvas2 = canvas.getContext("2d");
    historyCanvas2.clearRect(0, 0, canvas.width, canvas.height);

    historyCanvas2.font = `40px serif`;
    historyCanvas2.fillText("average weight:", 10, 60);
    historyCanvas2.fillText(`-max ${maxVal}`, 30, 120);
    historyCanvas2.fillText(`-min ${minVal}`, 30, 160);
}



let rotated = true;
function ChartChanging() {
    const canvas = document.getElementById("chart");
    const chartCanvas = canvas.getContext("2d");
    // chartCanvas.clearRect(-100, -100, canvas.width + 100, canvas.height + 100);

    if (!rotated) {
        chartCanvas.translate(740, 0);
        chartCanvas.rotate(Math.PI / 2);
        rotated = true;
    }


    chartCanvas.strokeStyle = "black";
    chartCanvas.fillStyle = `rgb(0, 0, 0)`;
    chartCanvas.font = `50px serif`;
    chartCanvas.fillText("weight at a specific time", 200, 40);


    chartCanvas.font = `34px serif`;
    chartCanvas.fillText("weight, kg", 60, 100);
    chartCanvas.fillText("0", 65, 590);
    for (var i = 1; i <= 4; i++) {
        chartCanvas.fillText(`${i * 20}`, 50, 590 - (i * 100));
    }
    chartCanvas.fillText("time", 690, 570);


    // now Ox it is Oy, Oy it is Ox
    if (rotated) {
        chartCanvas.translate(0, 740);
        chartCanvas.rotate(-Math.PI / 2);
        chartCanvas.lineWidth = 5;
        chartCanvas.strokeStyle = "black";
        rotated = false;
    }

    //chart rays
    let Ox = new Path2D();
    Ox.moveTo(160, 100);
    Ox.lineTo(160, 750);
    chartCanvas.stroke(Ox);

    let Oy = new Path2D();
    Oy.moveTo(160, 100);
    Oy.lineTo(630, 100);
    chartCanvas.stroke(Oy);

    let division = new Path2D();
    for (var i = 1; i <= 4; i++) {
        division.moveTo(160 + (100 * i), 90);
        division.lineTo(160 + (100 * i), 110);
    }
    chartCanvas.stroke(division);


    // print time
    for (let i = 0; i < data.infoData.length; i++) {
        let timeCounter = i.toString().length === 1 ? `0` + i.toString() : i.toString();
        chartCanvas.fillText(`t${timeCounter} ${data.infoData[i].time}`, -100, 156 + (i * 40));
    }


    // vals print
    chartCanvas.fillStyle = `rgb(7, 73, 106)`;
    for (let i = 0; i < data.infoData.length; i++) {
        chartCanvas.fillRect(163, 140 + (i * 40), data.infoData[i].weight / 1000 * 5, 15);
    }
}
