const dscc = window.dscc;

let configData = [];
let localState = {};
let metricField = null;

// Listen for data/config
dscc.subscribeToData(draw, { transform: dscc.objectTransform });

function draw(message) {
  const fields = message.fields;
  const rows = message.tables.DEFAULT || [];

  // Metric field (ONLY ONE REQUIRED)
  metricField = fields.metric[0].name;

  // Build config rows
  configData = rows.map(r => ({
    category: r.Category,
    subcategory: r.Subcategory,
    label: r.Label,
    min: Number(r.MinDefault),
    max: Number(r.MaxDefault),
    absMin: Number(r.AbsMin),
    absMax: Number(r.AbsMax)
  }));

  // Initialize local state
  configData.forEach((f, i) => {
    localState[i] = { min: f.min, max: f.max };
  });

  renderUI();
}

function renderUI() {
  const container = document.getElementById("modal-content");
  container.innerHTML = "";

  const grouped = {};

  configData.forEach((f, i) => {
    grouped[f.category] ??= {};
    grouped[f.category][f.subcategory] ??= [];
    grouped[f.category][f.subcategory].push({ ...f, index: i });
  });

  Object.entries(grouped).forEach(([cat, subs]) => {
    const catDiv = document.createElement("div");
    catDiv.className = "category";
    catDiv.textContent = cat;
    container.appendChild(catDiv);

    Object.entries(subs).forEach(([sub, items]) => {
      const subDiv = document.createElement("div");
      subDiv.className = "subcategory";
      subDiv.textContent = sub;
      container.appendChild(subDiv);

      items.forEach(item => {
        const row = document.createElement("div");
        row.className = "slider-row";

        row.innerHTML = `
          <div>${item.label}</div>
          <input type="range" min="${item.absMin}" max="${item.absMax}" 
            value="${localState[item.index].min}"
            data-i="${item.index}" data-type="min">
          <input type="range" min="${item.absMin}" max="${item.absMax}" 
            value="${localState[item.index].max}"
            data-i="${item.index}" data-type="max">
        `;

        row.querySelectorAll("input").forEach(input => {
          input.addEventListener("input", e => {
            const i = e.target.dataset.i;
            const t = e.target.dataset.type;
            localState[i][t] = Number(e.target.value);
          });
        });

        container.appendChild(row);
      });
    });
  });
}

// UI Controls
document.getElementById("filter-icon").onclick = () =>
  document.getElementById("modal-overlay").classList.remove("hidden");

document.getElementById("close-btn").onclick = () =>
  document.getElementById("modal-overlay").classList.add("hidden");

document.getElementById("reset-btn").onclick = () => {
  Object.keys(localState).forEach(i => {
    localState[i] = {
      min: configData[i].min,
      max: configData[i].max
    };
  });
  renderUI();
};

document.getElementById("apply-btn").onclick = () => {
  Object.values(localState).forEach(r => {
    dscc.sendInteraction({
      type: "FILTER",
      filter: {
        fieldName: metricField,
        operator: "BETWEEN",
        values: [r.min, r.max]
      }
    });
  });

  document.getElementById("modal-overlay").classList.add("hidden");
};
