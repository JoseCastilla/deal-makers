document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("leadForm");
    
    // PEGA AQUÍ LA URL DE TU WEBHOOK
    const GHL_WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/TU_WEBHOOK_ID"; 

    if(form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            btn.innerText = "PROCESANDO...";
            btn.disabled = true;

            const nombre = document.getElementById("nombre").value;
            const correo = document.getElementById("correo").value;
            const countryCode = document.getElementById("countryCode").value;
            const telefono = document.getElementById("telefono").value;
            const experiencia = document.getElementById("exp").value;
            
            // Unimos código y número, eliminando espacios
            const fullPhone = `${countryCode}${telefono.replace(/\s+/g, '')}`;

            const payload = {
                firstName: nombre,
                email: correo,
                phone: fullPhone,
                customData: {
                    experiencia: experiencia,
                    origen: "Landing Page Deal Makers",
                    pais: countryCode
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

                // Redirige a la página de gracias, inyectando el nombre en la URL
                window.location.href = `/gracias/index.html?name=${encodeURIComponent(nombre)}`;

            } catch (error) {
                console.error("Error:", error);
                alert("Ocurrió un error en el registro. Por favor, intenta de nuevo.");
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }
});