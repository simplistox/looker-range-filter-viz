const dscc = window.dscc;

let configData = [];
let localState = {};
let metricField = null;

dscc.subscribeToData(draw, { transform: dscc.objectTransform });

function draw(message) {
  if (!message.fields || !message.tables) return;
  if (!message.fields.metric || message.fields.metric.length === 0) return;

  metricField = message.fields.metric[0].name;

  const rows = message.tables.DEFAULT || [];
  configData = rows.map(function(r){
    return {
      category: r.Category,
      subcategory: r.Subcategory,
      label: r.Label,
      min: Number(r.MinDefault),
      max: Number(r.MaxDefault),
      absMin: Number(r.AbsMin),
      absMax: Number(r.AbsMax)
    };
  });

  configData.forEach(function(f,i){
    localState[i] = { min: f.min, max: f.max };
  });

  renderUI();
}

function renderUI() {
  const container = document.getElementById("modal-content");
  container.innerHTML = "";

  var grouped = {};
  for (var i=0;i<configData.length;i++){
    var f = configData[i];
    if (!grouped[f.category]) grouped[f.category] = {};
    if (!grouped[f.category][f.subcategory]) grouped[f.category][f.subcategory] = [];
    grouped[f.category][f.subcategory].push({ ...f, index: i });
  }

  for (var cat in grouped){
    var catDiv = document.createElement("div");
    catDiv.className = "category";
    catDiv.textContent = cat;
    container.appendChild(catDiv);

    for (var sub in grouped[cat]){
      var subDiv = document.createElement("div");
      subDiv.className = "subcategory";
      subDiv.textContent = sub;
      container.appendChild(subDiv);

      var items = grouped[cat][sub];
      for (var j=0;j<items.length;j++){
        var item = items[j];
        var row = document.createElement("div");
        row.className = "slider-row";
        row.innerHTML = '<div>'+item.label+'</div>'
          +'<input type="range" min="'+item.absMin+'" max="'+item.absMax+'" value="'+localState[item.index].min+'" data-i="'+item.index+'" data-type="min">'
          +'<input type="range" min="'+item.absMin+'" max="'+item.absMax+'" value="'+localState[item.index].max+'" data-i="'+item.index+'" data-type="max">';
        var inputs = row.querySelectorAll("input");
        for (var k=0;k<inputs.length;k++){
          inputs[k].addEventListener("input", function(e){
            var i = e.target.dataset.i;
            var t = e.target.dataset.type;
            localState[i][t] = Number(e.target.value);
          });
        }
        container.appendChild(row);
      }
    }
  }
}

// UI Controls
document.getElementById("filter-icon").onclick = function(){
  document.getElementById("modal-overlay").classList.remove("hidden");
};
document.getElementById("close-btn").onclick = function(){
  document.getElementById("modal-overlay").classList.add("hidden");
};
document.getElementById("reset-btn").onclick = function(){
  for (var i in localState){
    localState[i] = { min: configData[i].min, max: configData[i].max };
  }
  renderUI();
};
document.getElementById("apply-btn").onclick = function(){
  for (var i in localState){
    dscc.sendInteraction({
      type: "FILTER",
      filter: {
        fieldName: metricField,
        operator: "BETWEEN",
        values: [localState[i].min, localState[i].max]
      }
    });
  }
  document.getElementById("modal-overlay").classList.add("hidden");
};
