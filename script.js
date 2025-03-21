document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ Script loaded successfully."); // Debugging log

    const resetButton = document.getElementById("reset-button");
    if (resetButton) {
        resetButton.addEventListener("click", async function () {
            console.log("🔄 Reset button clicked."); // Debugging log

            // Reset displayed results
            document.getElementById("savings-result").textContent = "Препоръчителни спестявания: ";
            document.getElementById("spending-result").textContent = "Препорачителни пари за свободно ползване: ";

            try {
                const response = await fetch("/finance/reset-values", { method: "POST" });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                console.log("✅ Financial data reset successfully.");
            } catch (error) {
                console.error("❌ Error resetting financial data:", error);
            }
        });
    }

    const financeForm = document.getElementById("finance-form");

    if (financeForm) {
        financeForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            console.log("✅ Form submitted."); // Debugging log

            let incomeEntries = [];
            document.querySelectorAll("#income-entries .income-entry").forEach(entry => {
                let amount = entry.querySelector("input[name='sum[]']").value;
                let reasonSelect = entry.querySelector("select[name='income-reason[]']");
                let reason = reasonSelect.value;

                if (amount && reason) {
                    incomeEntries.push({ source: reason, amount: parseFloat(amount) });
                }
            });

            let outcomeEntries = [];
            document.querySelectorAll("#outcome-entries .outcome-entry").forEach(entry => {
                let amount = entry.querySelector("input[name='sum[]']").value;
                let reasonSelect = entry.querySelector("select[name='outcome-reason[]']");
                let reason = reasonSelect.value;

                if (amount && reason) {
                    outcomeEntries.push({ source: reason, amount: parseFloat(amount) });
                }
            });

            try {
                await fetch("/finance/add-income", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ entries: incomeEntries })
                });

                await fetch("/finance/add-outcome", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ entries: outcomeEntries })
                });

                const response = await fetch("/finance/calculate-savings", {
                    method: "GET",
                    headers: { "Accept": "application/json" }
                });

                if (!response.ok) {
                    console.error("❌ Error fetching savings:", await response.text());
                    throw new Error("Server error");
                }

                const data = await response.json();

                document.getElementById("savings-result").textContent = `Препоръчителни спестявания: ${data.savings.toFixed(2)} лв`;
                document.getElementById("spending-result").textContent = `Препорачителни пари за свободно ползване: ${data.spending.toFixed(2)} лв`;

            } catch (error) {
                console.error("❌ Fetch Error:", error);
                alert("Грешка при изчисленията! Проверете сървъра.");
            }
        });
    }
});

// ✅ Function to add more income entries
function addIncomeEntry() {
    let incomeDiv = document.createElement("div");
    incomeDiv.classList.add("income-entry");
    incomeDiv.innerHTML = `
        <div style="display: flex; align-items: center;">
            <div style="flex-grow: 1;">
                <label>Сума:</label>
                <input type="number" name="sum[]" required style="width: 100px;" />
                <br />
                <label>Причина за доход:</label>
                <select name="income-reason[]" required>
                    <option value="job">Работа</option>
                    <option value="other">Друго</option>
                </select>
                <br />
            </div>
            <button type="button" class="remove-entry" onclick="removeEntry(this)" 
                style="padding: 2px 5px; background: red; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">X</button>
        </div>
    `;
    document.getElementById("income-entries").appendChild(incomeDiv);
}

// ✅ Function to add more outcome entries (Food & Transport added)
function addOutcomeEntry() {
    let outcomeDiv = document.createElement("div");
    outcomeDiv.classList.add("outcome-entry");
    outcomeDiv.innerHTML = `
        <div style="display: flex; align-items: center;">
            <div style="flex-grow: 1;">
                <label>Сума:</label>
                <input type="number" name="sum[]" required style="width: 100px;" />
                <br />
                <label>Причина за разход:</label>
                <select name="outcome-reason[]" required>
                    <option value="bills">Сметки</option>
                    <option value="entertainment">Развлечения</option>
                    <option value="food">Храна</option>
                    <option value="transport">Транспорт</option>
                    <option value="other">Друго</option>
                </select>
                <br />
            </div>
            <button type="button" class="remove-entry" onclick="removeEntry(this)" 
                style="padding: 2px 5px; background: red; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">X</button>
        </div>
    `;
    document.getElementById("outcome-entries").appendChild(outcomeDiv);
}

// ✅ Function to remove an added entry
function removeEntry(button) {
    button.closest(".income-entry, .outcome-entry").remove();
}
