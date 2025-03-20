document.addEventListener("DOMContentLoaded", function () {
    const financeForm = document.getElementById("finance-form");

    financeForm.addEventListener("submit", async function (event) {
        event.preventDefault(); // Prevent form submission
        
        // Collect Income Data
        let incomeEntries = [];
        document.querySelectorAll("#income-entries .income-entry").forEach(entry => {
            let amount = entry.querySelector("input[name='sum[]']").value;
            let reasonSelect = entry.querySelector("select[name='income-reason[]']");
            let reason = reasonSelect.value === "other" 
                ? entry.querySelector("input[name='custom-income-reason[]']").value 
                : reasonSelect.value;

            if (amount && reason) {
                incomeEntries.push({ source: reason, amount: parseFloat(amount) });
            }
        });

        // Collect Outcome Data
        let outcomeEntries = [];
        document.querySelectorAll("#outcome-entries .outcome-entry").forEach(entry => {
            let amount = entry.querySelector("input[name='sum[]']").value;
            let reasonSelect = entry.querySelector("select[name='outcome-reason[]']");
            let reason = reasonSelect.value === "other" 
                ? entry.querySelector("input[name='custom-outcome-reason[]']").value 
                : reasonSelect.value;

            if (amount && reason) {
                outcomeEntries.push({ source: reason, amount: parseFloat(amount) });
            }
        });

        // Send income data to backend
        await fetch("http://localhost:4000/finance/add-income", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entries: incomeEntries })
        });

        // Send outcome data to backend
        await fetch("http://localhost:4000/finance/add-outcome", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entries: outcomeEntries })
        });

        // Fetch and display savings calculation
        const response = await fetch("http://localhost:4000/finance/calculate-savings");
        const data = await response.json();

        alert(`Спестявания: ${data.savings} лв\nРазходи: ${data.spending} лв`);
    });
});

// Function to add more income entries
function addIncomeEntry() {
    let incomeDiv = document.createElement("div");
    incomeDiv.classList.add("income-entry");
    incomeDiv.innerHTML = `
        <label for="sum">Сума:</label>
        <input type="number" name="sum[]" required />
        <br />
        <label for="income-reason">Причина за доход:</label>
        <select name="income-reason[]" required onchange="toggleCustomReason(this)">
            <option value="job">Работа</option>
            <option value="other">Друго</option>
        </select>
        <br />
        <input type="text" name="custom-income-reason[]" class="custom-reason" placeholder="Въведете причина" style="display:none;" />
    `;
    document.getElementById("income-entries").appendChild(incomeDiv);
}

// Function to add more outcome entries
function addOutcomeEntry() {
    let outcomeDiv = document.createElement("div");
    outcomeDiv.classList.add("outcome-entry");
    outcomeDiv.innerHTML = `
        <label for="sum">Сума:</label>
        <input type="number" name="sum[]" required />
        <br />
        <label for="outcome-reason">Причина за разход:</label>
        <select name="outcome-reason[]" required onchange="toggleCustomReason(this)">
            <option value="bills">Сметки</option>
            <option value="entertainment">Развлечения</option>
            <option value="other">Друго</option>
        </select>
        <br />
        <input type="text" name="custom-outcome-reason[]" class="custom-reason" placeholder="Въведете причина" style="display:none;" />
    `;
    document.getElementById("outcome-entries").appendChild(outcomeDiv);
}

// Show custom reason input when "Other" is selected
function toggleCustomReason(selectElement) {
    let customInput = selectElement.parentElement.querySelector(".custom-reason");
    customInput.style.display = selectElement.value === "other" ? "block" : "none";
}