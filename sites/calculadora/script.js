import { h, render } from "https://esm.sh/preact";
import { useEffect, useState } from "https://esm.sh/preact/hooks";

function App() {
  const [priceEuro, setPriceEuro] = useState('');
  const [buyers, setBuyers] = useState('');
  const [result, setResult] = useState(null);
  const [cotizaciones, setCotizaciones] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const envioEuro = 50;
  const bonificacionUsd = 50;

  useEffect(() => {
    setError(null);
    fetch('https://dolarapi.com/v1/dolares')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(dolares => {
        const blue = dolares.find(d => d.nombre === 'Blue');
        const oficial = dolares.find(d => d.nombre === 'Oficial');

        if (!blue || !oficial) {
          throw new Error('No se encontraron cotizaciones para Dólar Blue o Oficial.');
        }

        const valorDolar = Math.max(blue.venta, oficial.venta);

        return fetch('https://dolarapi.com/v1/cotizaciones/eur')
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then(euro => {
            if (!euro || typeof euro.venta === 'undefined') {
              throw new Error('No se encontró cotización para el Euro.');
            }
            return {
              euroVenta: Math.ceil((euro.venta / oficial.venta) * 100) / 100,
              usdVenta: 1,
              usdBlueVenta: valorDolar
            };
          });
      })
      .then(data => {
        setCotizaciones(data);
        setLoading(false);
        setError(null);
      })
      .catch(error => {
        console.error('Error al obtener cotizaciones:', error);
        setError('No se pudieron cargar las cotizaciones. Intenta de nuevo más tarde.');
        setCotizaciones({
          euroVenta: 0,
          usdVenta: 0,
          usdBlueVenta: 0
        });
        setLoading(false);
      });
  }, []);

  const calcular = () => {
    if (!cotizaciones || cotizaciones.euroVenta === 0 || cotizaciones.usdBlueVenta === 0) {
      setError('Las cotizaciones no están cargadas o son inválidas. No se puede calcular.');
      return;
    }
    setError(null);

    const price = parseFloat(priceEuro);
    const cantidadCompradores = parseInt(buyers);

    if (isNaN(price) || price <= 0) {
      setError('Por favor, ingresa un precio de producto válido y mayor a cero.');
      return;
    }
    if (isNaN(cantidadCompradores) || cantidadCompradores <= 0) {
      setError('Por favor, ingresa una cantidad de compradores válida y mayor a cero.');
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
    h("h1", { style: { textAlign: 'center', marginBottom: '30px', color: '#333' } }, "Calculadora de Compras Internacionales"),

    loading ? (
      h("div", { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' } },
        h("div", {
          className: 'spinner',
          style: {
            border: '6px solid #eee',
            borderTop: '6px solid #1976d2',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
          }
        })
      )
    ) : (
      h("div", { style: { background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } },
        error && h("div", {
          style: {
            backgroundColor: '#ffe0e0',
            color: '#d32f2f',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #d32f2f',
            fontWeight: 'bold'
          }
        }, error),

        h("h2", { style: { fontSize: '20px', marginBottom: '20px', color: '#555' } }, "Cotizaciones actuales"),
        h("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '30px', justifyContent: 'space-around' } },
          h("div", { style: {
            backgroundColor: '#e3f2fd', color: '#1976d2', padding: '8px 15px', borderRadius: '20px', fontSize: '0.95rem', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}, `Euro Venta: ${cotizaciones.euroVenta.toFixed(2)} EUR/USD`),
          h("div", { style: {
            backgroundColor: '#e3f2fd', color: '#1976d2', padding: '8px 15px', borderRadius: '20px', fontSize: '0.95rem', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}, `USD Venta: ${cotizaciones.usdVenta.toFixed(2)} USD`),
          h("div", { style: {
            backgroundColor: '#e3f2fd', color: '#1976d2', padding: '8px 15px', borderRadius: '20px', fontSize: '0.95rem', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}, `Cotización USD/ARS: ${cotizaciones.usdBlueVenta.toFixed(2)} ARS`)
        ),

        h("div", { style: { marginBottom: '20px' } },
          h("label", { style: { fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#444' } }, "Precio del producto (€):"),
          h("input", {
            type: "number",
            value: priceEuro,
            onInput: (e) => setPriceEuro(e.target.value),
            style: { width: '100%', paddingLeft: '12px', paddingTop: '12px', paddingBottom: '12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '16px' }
          })
        ),
        h("div", { style: { marginBottom: '30px' } },
          h("label", { style: { fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#444' } }, "Cantidad de compradores:"),
          h("input", {
            type: "number",
            value: buyers,
            onInput: (e) => setBuyers(e.target.value),
            style: { width: '100%', paddingLeft: '12px', paddingTop: '12px', paddingBottom: '12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '16px' }
          })
        ),
        h("button", {
          style: {
            width: '100%',
            padding: '14px',
            backgroundColor: '#1976d2',
            color: 'white',
            fontSize: '17px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease',
            fontWeight: 'bold',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          },
          onClick: calcular,
          onMouseOver: (e) => e.target.style.backgroundColor = '#115293',
          onMouseOut: (e) => e.target.style.backgroundColor = '#1976d2'
        }, "Calcular"),

        result && h("div", {
          style: { marginTop: '10px', padding: '25px', borderRadius: '10px', background: '#fefefe', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }
        },
          h("h2", { style: { fontSize: '22px', marginBottom: '20px', color: '#333' } }, "Resultado por persona"),
          h("div", { style: { lineHeight: '2', '& p': { marginBottom: '8px' } } },
            h("p", null, h("strong", null, "Precio del producto (USD):"), ` ${result.priceUsd.toFixed(2)} USD`),
            h("p", null, h("strong", null, "Envío total (USD):"), ` ${result.envioUsd.toFixed(2)} USD`),
            h("p", null, h("strong", null, "Envío por persona (USD):"), h("span", { style: { color: '#D32F2F', fontWeight: 'bold' } }, ` ${result.envioPorPersona.toFixed(2)} USD`)),
            h("p", null, h("strong", null, "Bonificación aduanera por persona (USD):"), h("span", { style: { color: '#388E3C', fontWeight: 'bold' } }, ` ${result.bonificacionPorPersona.toFixed(2)} USD`)),
            h("p", { style: { fontSize: '1.05rem', fontWeight: 'bold', backgroundColor: '#fffbe5', padding: '8px 12px', borderRadius: '4px', borderLeft: '5px solid #ffc107', marginBottom: '10px' } },
              h("strong", null, "Total antes de aduana (USD):"), ` ${result.totalAntesAduana.toFixed(2)} USD`
            ),
            h("p", null, h("strong", null, "Excedente después de bonificación (USD):"), h("span", { style: { color: '#D32F2F', fontWeight: 'bold' } }, ` ${result.excedenteBonificacion.toFixed(2)} USD`)),
            h("p", { style: { fontSize: '1.05rem', fontWeight: 'bold', backgroundColor: '#ffe0e0', padding: '8px 12px', borderRadius: '4px', borderLeft: '5px solid #d32f2f', marginBottom: '10px' } },
              h("strong", null, "Impuesto aduana (USD):"), h("span", { style: { color: '#D32F2F', fontWeight: 'bold' } }, ` ${result.impuestoAduana.toFixed(2)} USD`)
            ),
            h("hr", { style: { margin: '20px 0', borderColor: '#eee' } }),
            h("p", { style: { fontWeight: 'bold', fontSize: '1.3rem', backgroundColor: '#e3f2fd', padding: '12px 18px', borderRadius: '8px', borderLeft: '8px solid #1976d2', marginBottom: '15px' } },
              h("strong", null, "Total final por persona (USD):"), h("span", { style: { color: '#1976d2' } }, ` ${result.totalFinalUsd.toFixed(2)} USD`)
            ),
            h("p", { style: { fontWeight: 'bold', fontSize: '1.3rem', backgroundColor: '#e8f5e9', padding: '12px 18px', borderRadius: '8px', borderLeft: '8px solid #388E3C' } },
              h("strong", null, "Total final por persona (ARS):"), h("span", { style: { color: '#388E3C' } }, ` ${result.totalFinalArs.toFixed(2)} ARS`)
            )
          )
        )
      )
    )
  );
}

render(h(App), document.getElementById('app'));
