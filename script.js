document.addEventListener("DOMContentLoaded", function () {
    const financeForm = document.getElementById("finance-form");

    financeForm.addEventListener("submit", async function (event) {
        event.preventDefault();

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

        try {
            console.log("Sending data to backend...");

            // Send income data, then outcome data, then calculate savings
            await fetch("/finance/add-income", { 
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entries: incomeEntries }) 
            })
            await fetch("/finance/add-outcome", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ entries: outcomeEntries })
            })
            const response = await fetch("/finance/calculate-savings", {
                method: "GET",
                headers: { "Accept": "application/json" }

            
            });
            console.log(response)
            if (!response.ok) {
                console.error("Error fetching savings:", await response.text());
                throw new Error("Server error");
            }

            const data = await response.json();

            console.log("Savings received:", data);

            document.getElementById("savings-result").textContent = `Спестявания: ${data.savings.toFixed(2)} лв`;
            document.getElementById("spending-result").textContent = `Разходи: ${data.spending.toFixed(2)} лв`;

        } catch (error) {
            console.error("Fetch Error:", error);
            alert("Грешка при изчисленията! Проверете сървъра.");
        }
    });
});