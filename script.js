let currentUsername = "";

document.addEventListener("DOMContentLoaded", function () {
    console.log("Script loaded successfully.");

    const usernameInput = document.getElementById("username");
    const saveUsernameButton = document.getElementById("save-username");

    if (saveUsernameButton) {
        saveUsernameButton.addEventListener("click", function () {
            const enteredUsername = usernameInput.value.trim();
            if (enteredUsername !== "") {
                currentUsernam= enteredUsername;
                console.log(`Username saved: ${currentUsername}`);
                alert(`Потребителското име "${currentUsername}" е запазено.`);
            } else {
                alert("Моля, въведете валидно потребителско име.");
            }
        });
    }

    const resetButton = document.getElementById("reset-button");
    if (resetButton) {
        resetButton.addEventListener("click", async function () {
            console.log("Reset button clicked.");

            document.getElementById("savings-result").textContent = "Препоръчителни спестявания: ";
            document.getElementById("spending-result").textContent = "Препорачителни пари за свободно ползване: ";

            try {
                const response = await fetch("/finance/reset-values", { method: "POST" });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                console.log("Financial data reset successfully.");
            } catch (error) {
                console.error("Error resetting financial data:", error);
            }
        });
    }

    const financeForm = document.getElementById("finance-form");

    if (financeForm) {
        financeForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            if (currentUsername === "") {
                alert("Моля, въведете потребителско име преди да изпратите формуляра.");
                return;
            }

            console.log(`Form submitted by ${currentUsername}.`);

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
                    body: JSON.stringify({ username: currentUsername, entries: incomeEntries })
                });

                await fetch("/finance/add-outcome", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: currentUsername, entries: outcomeEntries })
                });

                const response = await fetch("/finance/calculate-savings", {
                    method: "GET",
                    headers: { "Accept": "application/json" }
                });

                if (!response.ok) {
                    console.error("Error fetching savings:", await response.text());
                    throw new Error("Server error");
                }

                const data = await response.json();

                document.getElementById("savings-result").textContent = `Препоръчителни спестявания за ${currentUsername}: ${data.savings.toFixed(2)} лв`;
                document.getElementById("spending-result").textContent = `Препорачителни пари за свободно ползване за ${currentUsername}: ${data.spending.toFixed(2)} лв`;

            } catch (error) {
                console.error("Fetch Error:", error);
                alert("Грешка при изчисленията! Проверете сървъра.");
            }
        });
    }
});

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

function removeEntry(button) {
    button.closest(".income-entry, .outcome-entry").remove();
}
