document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("leadForm");
    
    // 1. Manejo de la selección visual y actualización del input hidden
    const cards = document.querySelectorAll('.ccard');
    const ciudadInput = document.getElementById('ciudad');

    cards.forEach(card => {
        card.addEventListener('click', function() {
            // Remover clase 'sel' de todas las tarjetas
            cards.forEach(c => c.classList.remove('sel'));
            
            // Añadir clase 'sel' a la tarjeta clickeada
            this.classList.add('sel');
            
            // Actualizar el input hidden con el valor del data-city
            const seleccionada = this.getAttribute('data-city');
            ciudadInput.value = seleccionada;
            
            console.log("Ciudad seleccionada:", seleccionada); // Debug
        });
    });

    // PEGA AQUÍ LA URL DE TU WEBHOOK
    const GHL_WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/BGswUQdyvP0DFEjEBLOe/webhook-trigger/b99499fe-52ee-4fdc-bf13-447fa852006a"; 

    if(form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            btn.innerText = "PROCESANDO...";
            btn.disabled = true;

            const ciudad = document.getElementById("ciudad").value;
            const nombre = document.getElementById("nombre").value;
            const apellido = document.getElementById("apellido").value;
            const correo = document.getElementById("correo").value;
            const countryCode = document.getElementById("countryCode").value;
            const telefono = document.getElementById("telefono").value;
            const experiencia = document.getElementById("exp").value;
            
            // Unimos código y número, eliminando espacios
            const fullPhone = `${countryCode}${telefono.replace(/\s+/g, '')}`;

            const payload = {
                firstName: nombre,
                lastName: apellido,
                email: correo,
                phone: fullPhone,
                customData: {
                    ciudad_evento: ciudad,
                    experiencia: experiencia,
                    origen: "Landing Page Deal Makers",
                }
            };

            try {
                await fetch(GHL_WEBHOOK_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                // Si estás usando la API de Conversiones o Pixel estándar de Meta:
                if (typeof fbq === 'function') {
                    fbq('track', 'Lead'); 
                }

                // Redirige a la página de la ciudad seleccionada, , inyectando el nombre en la URL
                const carpetaCiudad = ciudad.toLowerCase();
                window.location.href = `/${carpetaCiudad}/index.html?name=${encodeURIComponent(nombre)}`;

            } catch (error) {
                console.error("Error:", error);
                alert("Ocurrió un error en el registro. Por favor, intenta de nuevo.");
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }
});
