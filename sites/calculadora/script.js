import { h, render } from "https://esm.sh/preact";
import { useEffect, useState } from "https://esm.sh/preact/hooks";

function App() {
  const [priceEuro, setPriceEuro] = useState('');
  const [buyers, setBuyers] = useState('');
  const [result, setResult] = useState(null);
  const [cotizaciones, setCotizaciones] = useState(null);
  const [loading, setLoading] = useState(true);

  const envioEuro = 50;
  const bonificacionUsd = 50;

  useEffect(() => {
    fetch('https://dolarapi.com/v1/dolares')
      .then(response => response.json())
      .then(dolares => {
        const blue = dolares.find(d => d.nombre === 'Blue');
        const oficial = dolares.find(d => d.nombre === 'Oficial');

        const valorDolar = Math.max(blue.venta, oficial.venta);

        return fetch('https://dolarapi.com/v1/cotizaciones/eur')
          .then(response => response.json())
          .then(euro => ({
            euroVenta: Math.ceil((euro.venta / oficial.venta) * 100) / 100,
            usdVenta: 1,
            usdBlueVenta: valorDolar
          }));
      })
      .then(data => {
        setCotizaciones(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error al obtener cotizaciones:', error);
        setCotizaciones({
          euroVenta: 0,
          usdVenta: 0,
          usdBlueVenta: 0
        });
        setLoading(false);
      });
  }, []);

  const calcular = () => {
    if (!cotizaciones) {
      alert('Cotizaciones no cargadas aún.');
      return;
    }

    const price = parseFloat(priceEuro);
    const cantidadCompradores = parseInt(buyers);

    if (isNaN(price) || isNaN(cantidadCompradores) || cantidadCompradores <= 0) {
      alert('Por favor ingresa valores válidos.');
      return;
    }

    const { euroVenta, usdVenta, usdBlueVenta } = cotizaciones;

    const priceUsd = price * euroVenta / usdVenta;
    const envioUsd = envioEuro * euroVenta / usdVenta;

    const envioPorPersona = envioUsd / cantidadCompradores;
    const bonificacionPorPersona = bonificacionUsd / cantidadCompradores;

    const totalAntesAduana = priceUsd + envioPorPersona;

    const excedenteBonificacion = Math.max(0, totalAntesAduana - bonificacionPorPersona);
    const impuestoAduana = excedenteBonificacion * 0.5;

    const totalFinalUsd = totalAntesAduana + impuestoAduana;
    const totalFinalArs = totalFinalUsd * usdBlueVenta;

    setResult({
      priceUsd,
      envioUsd,
      envioPorPersona,
      bonificacionPorPersona,
      totalAntesAduana,
      excedenteBonificacion,
      impuestoAduana,
      totalFinalUsd,
      totalFinalArs
    });
  };

  return h("div", { style: { padding: '20px', maxWidth: '800px', margin: '40px auto', fontFamily: "'Roboto', sans-serif" } },
    h("h1", { style: { textAlign: 'center', marginBottom: '30px' } }, "Calculadora de Compras Internacionales"),

    loading ? (
      h("div", { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' } },
        h("div", {
          style: { 
            border: '6px solid #eee', 
            borderTop: '6px solid #1976d2', 
            borderRadius: '50%', 
            width: '50px', 
            height: '50px', 
            animation: 'spin 1s linear infinite' 
          }
        })
      )
    ) : (
      h("div", { style: { background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } },
        h("h2", { style: { fontSize: '20px', marginBottom: '15px' } }, "Cotizaciones actuales"),
        h("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '30px' } },
          h("div", { style: { flex: '1', minWidth: '150px' } },
            h("strong", null, "Euro Venta:"), ` ${cotizaciones.euroVenta} EUR`
          ),
          h("div", { style: { flex: '1', minWidth: '150px' } },
            h("strong", null, "USD Venta:"), ` ${cotizaciones.usdVenta} USD`
          ),
          h("div", { style: { flex: '1', minWidth: '150px' } },
            h("strong", null, "USD Blue Venta:"), ` ${cotizaciones.usdBlueVenta} ARS`
          )
        ),
        h("div", { style: { marginBottom: '20px' } },
          h("label", { style: { fontWeight: 'bold' } }, "Precio del producto (€):"),
          h("input", {
            type: "number",
            value: priceEuro,
            onInput: (e) => setPriceEuro(e.target.value),
            style: { width: '100%', padding: '10px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '6px' }
          })
        ),
        h("div", { style: { marginBottom: '20px' } },
          h("label", { style: { fontWeight: 'bold' } }, "Cantidad de compradores:"),
          h("input", {
            type: "number",
            value: buyers,
            onInput: (e) => setBuyers(e.target.value),
            style: { width: '100%', padding: '10px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '6px' }
          })
        ),
        h("button", {
          style: { 
            width: '100%', 
            padding: '12px', 
            backgroundColor: '#1976d2', 
            color: 'white', 
            fontSize: '16px', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: 'pointer', 
            transition: 'background-color 0.3s' 
          },
          onClick: calcular,
          onMouseOver: (e) => e.target.style.backgroundColor = '#115293',
          onMouseOut: (e) => e.target.style.backgroundColor = '#1976d2'
        }, "Calcular"),

        result && h("div", {
          style: { marginTop: '30px', background: '#f9f9f9', padding: '20px', borderRadius: '10px', border: '1px solid #ddd' }
        },
          h("h2", { style: { fontSize: '20px', marginBottom: '15px' } }, "Resultado"),
          h("div", { style: { lineHeight: '1.8' } },
            h("p", null, h("strong", null, "Precio en USD:"), ` ${result.priceUsd.toFixed(2)} USD`),
            h("p", null, h("strong", null, "Envío total (USD):"), ` ${result.envioUsd.toFixed(2)} USD`),
            h("p", null, h("strong", null, "Envío por persona:"), ` ${result.envioPorPersona.toFixed(2)} USD`),
            h("p", null, h("strong", null, "Bonificación por persona:"), ` ${result.bonificacionPorPersona.toFixed(2)} USD`),
            h("p", null, h("strong", null, "Total antes de aduana:"), ` ${result.totalAntesAduana.toFixed(2)} USD`),
            h("p", null, h("strong", null, "Excedente después de bonificación:"), ` ${result.excedenteBonificacion.toFixed(2)} USD`),
            h("p", null, h("strong", null, "Impuesto aduana (50% excedente):"), ` ${result.impuestoAduana.toFixed(2)} USD`),
            h("hr", { style: { margin: '15px 0' } }),
            h("p", null, h("strong", null, "Total final en USD:"), ` ${result.totalFinalUsd.toFixed(2)} USD`),
            h("p", null, h("strong", null, "Total final en ARS (blue):"), ` ${result.totalFinalArs.toFixed(2)} ARS`)
          )
        )
      )
    )
  );
}

render(h(App), document.getElementById('app'));
