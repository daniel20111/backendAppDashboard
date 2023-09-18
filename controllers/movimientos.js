const { Movimiento } = require("../models");
const { Producto } = require("../models");
const { Stock } = require("../models");
const moment = require("moment");
const ss = require("simple-statistics");
const math = require("mathjs");

//
const obtenerMovimientos = async (req, res = response) => {
	//const { limite = 10, desde = 0 } = req.query;
	const query = { estado: true };

	const [total, movimientos] = await Promise.all([
		Movimiento.countDocuments(query),
		Movimiento.find(query)
			.sort({ fecha: -1 })
			.populate("usuario", "nombre")
			.populate({
				path: "stock",
				populate: [
					{
						path: "producto",
						model: "Producto",
						select: "nombre img",
					},
					{
						path: "sucursal",
						model: "Sucursal",
						select: "municipio",
					},
				],
			})
			.populate({
				path: "verificado_por",
				model: "Usuario",
				select: "nombre",
			}), // Modificar esta línea para incluir la referencia correcta al modelo
		//.skip(Number(desde))
		//.limit(Number(limite)),
	]);

	res.json({
		total,
		movimientos,
	});
};
const obtenerMovimientosPorVenta = async (req, res = response) => {
	const { ventaId } = req.params; // Suponiendo que envías el ID de la venta como un parámetro en la URL

	try {
		const movimientos = await Movimiento.find({ venta: ventaId })
			.sort({ fecha: -1 })
			.populate("usuario", "nombre")
			.populate({
				path: "stock",
				populate: [
					{
						path: "producto",
						model: "Producto",
						select: "nombre img",
					},
					{
						path: "sucursal",
						model: "Sucursal",
						select: "municipio",
					},
				],
			})
			.populate({
				path: "verificado_por",
				model: "Usuario",
				select: "nombre",
			});

		res.json({
			total: movimientos.length,
			movimientos,
		});
	} catch (error) {
		res.status(500).json({
			msg: "Ocurrió un error al obtener los movimientos por venta",
			error,
		});
	}
};

const buscarMovimientos = async (req, res = response) => {
	const nombreProducto = req.query.nombreProducto;

	// Primero encontrar los productos cuyo nombre coincide con el término de búsqueda
	const productos = await Producto.find({
		nombre: { $regex: nombreProducto, $options: "i" },
	});

	// Extraer los IDs de los productos
	const productIds = productos.map((producto) => producto._id);

	// Buscar stocks relacionados a los productos
	const stocks = await Stock.find({ producto: { $in: productIds } });

	// Extraer los IDs de los stocks
	const stockIds = stocks.map((stock) => stock._id);

	const query = {
		estado: true,
		stock: { $in: stockIds },
	};

	const [total, movimientos] = await Promise.all([
		Movimiento.countDocuments(query),
		Movimiento.find(query)
			.sort({ fecha: -1 })
			.populate("usuario", "nombre")
			.populate({
				path: "stock",
				populate: [
					{
						path: "producto",
						model: "Producto",
						select: "nombre img",
					},
					{
						path: "sucursal",
						model: "Sucursal",
						select: "municipio",
					},
				],
			})
			.populate({
				path: "verificado_por",
				model: "Usuario",
				select: "nombre",
			}),
	]);

	res.json({
		total,
		movimientos,
	});
};

function boxMullerRandom(media, desviacionTipica) {
	let u = 0,
		v = 0;
	while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
	while (v === 0) v = Math.random();
	let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
	num = num * desviacionTipica + media; // Transformar para que encaje en la distribución
	return num;
}

const simularVentas = async (req, res) => {
	const { stock } = req.body;
	const usuario = req.usuario._id;

	console.log("Simulando ventas para el stock");

	try {
		for (let i = 0; i < 30; i++) {
			const cantidadCajas = Math.round(boxMullerRandom(12, 5));

			console.log("Cantidad de cajas:", cantidadCajas);

			// Genera una fecha aleatoria en el último año
			const fechaAleatoria = moment()
				.subtract(Math.floor(Math.random() * 365), "days")
				.toDate();

			console.log("Fecha Aleatoria:", fechaAleatoria);

			const movimiento = new Movimiento({
				usuario: usuario,
				stock: stock,
				cantidadCajas: cantidadCajas,
				cantidadPiezas: 0,
				movimiento: "SALIDA",
				verificacion: "VERIFICADO",
				venta: "64f123c61fc9203be4742b9e",
				fecha: fechaAleatoria, // Asegúrate de que tu modelo de Movimiento permita establecer la fecha
			});

			await movimiento.save();
		}

		res.status(200).json({
			msg: "Movimientos de venta simulados y guardados exitosamente.",
		});
	} catch (error) {
		res.status(500).json({
			msg: "Hubo un error al simular las ventas",
			error,
		});
	}
};

// Test de Kolmogorov-Smirnov para determinar si la muestra sigue una distribución teórica
const testKolmogorov = (muestras, F_teo) => {
	console.log("=== Iniciando test de Kolmogorov-Smirnov ===");

	// Hipótesis Nula H0: Los datos siguen la distribución especificada por F_teo
	// Hipótesis Alternativa H1: Los datos no siguen la distribución especificada por F_teo
	console.log(
		"Hipótesis Nula H0: Los datos siguen la distribución especificada por F_teo"
	);
	console.log(
		"Hipótesis Alternativa H1: Los datos no siguen la distribución especificada por F_teo"
	);

	// Variable para almacenar la máxima diferencia entre F_obs y F_teo
	let D = 0;

	console.log("Número total de muestras:", muestras.length);

	for (let i = 0; i < muestras.length; i++) {
		// Calculamos la función de distribución observada (F_obs) en la i-ésima posición
		const F_obs = (i + 1) / muestras.length;

		// Calculamos la función de distribución teórica (F_teo) para el valor de la muestra en la i-ésima posición
		const F_teo_value = F_teo(muestras[i]);

		// Calculamos la diferencia absoluta entre F_obs y F_teo
		const diff = Math.abs(F_obs - F_teo_value);

		console.log(`Iteración ${i + 1}:`);
		console.log(`- Valor de muestra: ${muestras[i]}`);
		console.log(`- F_obs: ${F_obs}`);
		console.log(`- F_teo: ${F_teo_value}`);
		console.log(`- Diferencia absoluta: ${diff}`);

		// Actualizamos D si la nueva diferencia es mayor que la anterior
		if (diff > D) {
			D = diff;
			console.log(`Nuevo valor máximo de D: ${D}`);
		}
	}

	// Calculamos el valor crítico con un nivel de confianza del 95%
	const valorCritico = 1.36 / Math.sqrt(muestras.length);
	console.log(`Valor crítico: ${valorCritico}`);

	// Tomamos una decisión respecto a la hipótesis nula
	if (D > valorCritico) {
		console.log("D > Valor crítico. Rechazamos la hipótesis nula (H0).");
		return "No sigue la distribución";
	} else {
		console.log("D <= Valor crítico. No rechazamos la hipótesis nula (H0).");
		return "Sigue la distribución";
	}
};

// Coeficiente binomial para la distribución binomial
function binomialCoefficient(n, k) {
	let coeff = 1;
	for (let x = n - k + 1; x <= n; x++) coeff *= x;
	for (let x = 1; x <= k; x++) coeff /= x;
	return coeff;
}

// Función de distribución acumulativa binomial
function binomialCDF(x, n, p) {
	let cdf = 0;
	for (let k = 0; k <= x; k++) {
		cdf += binomialCoefficient(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
	}
	return cdf;
}

// Funciones para calcular el punto de reorden- Normal, Exponencial y Binomial
const calcularReordenNormal = (media, desviacionTipica, Z) => {
	return media + Z * desviacionTipica;
};

const calcularReordenExponencial = (lambda, nivelServicio) => {
	return -Math.log(1 - nivelServicio) / lambda;
};

const calcularReordenBinomial = (n, p, nivelServicio) => {
	let x = 0;
	while (binomialCDF(x, n, p) < nivelServicio) {
		x++;
	}
	return x;
};

// Función principal para calcular métricas EOQ
const calculateEOQMetrics = async (req, res) => {
	console.log("Inicio de la función calculateEOQMetrics");

	// Recuperando el stock desde el cuerpo de la petición
	const { stock } = req.body;

	//Encontrar Stock

	const buscarStock = await Stock.findById(stock).populate(
		"producto",
		"precioCaja"
	);

	const leadTime = 1; // en semanas
	const costoPedido = 120; // en bolivianos
	const costoInventario = buscarStock.producto.precioCaja * 0.05; // en bolivianos por caja por año
	const costoEscasez = buscarStock.producto.precioCaja * 0.5; // en bolivianos
	const capacidadMaxima = 3000; // capacidad máxima del almacén en cajas
	const maximoPorPedido = 100; // máximo de cajas por pedido
	const semanasAnuales = 52; // semanas en un año

	const lastYear = moment().subtract(1, "years").toDate();

	try {
		// Obteniendo los movimientos relacionados al stock
		const movimientos = await Movimiento.find({
			stock: stock,
			venta: { $ne: null },
			fecha: { $gte: lastYear },
		});

		let muestras = [];
		movimientos.forEach((mov) => muestras.push(mov.cantidadCajas));
		muestras.sort((a, b) => a - b);

		// Calculando estadísticas descriptivas: media y desviación estándar
		const media = ss.mean(muestras);
		const desviacionTipica = ss.standardDeviation(muestras);

		// Cálculo de la demanda anual
		const demandaAnual = muestras.reduce((a, b) => a + b, 0);

		// Función de distribución acumulativa teórica para la normal
		const F_teo_normal = (x) =>
			ss.cumulativeStdNormalProbability((x - media) / desviacionTipica);

		// Función de distribución acumulativa teórica para la exponencial
		const lambda = 1 / media;
		const F_teo_exponencial = (x) => 1 - Math.exp(-lambda * x);

		// Función de distribución acumulativa teórica para la binomial
		const n = 20;
		const p = 0.5;
		const F_teo_binomial = (x) => binomialCDF(x, n, p);

		// Ejecutando test de Kolmogorov-Smirnov para cada distribución
		const resultadoNormal = testKolmogorov(muestras, F_teo_normal);
		const resultadoExponencial = testKolmogorov(muestras, F_teo_exponencial);
		const resultadoBinomial = testKolmogorov(muestras, F_teo_binomial);

		//Calculando EOQ
		const EOQ = Math.sqrt((2 * demandaAnual * costoPedido) / costoInventario);

		// Cálculos para E[X] y sigma_X
		const EX = (demandaAnual / semanasAnuales) * leadTime;
		const sigmaX =
			(desviacionTipica / Math.sqrt(semanasAnuales)) * Math.sqrt(leadTime);

		//Calculo del punto de reorden

		let R;

		if (resultadoNormal === "Sigue la distribución") {
			const Z = 1.65; // Nivel de confianza para la normal
			R = calcularReordenNormal(EX, sigmaX, Z);
		} else if (resultadoExponencial === "Sigue la distribución") {
			const nivelServicio = 0.95; // Nivel de servicio deseado
			R = calcularReordenExponencial(lambda, nivelServicio);
		} else if (resultadoBinomial === "Sigue la distribución") {
			const nivelServicio = 0.95; // Nivel de servicio deseado
			R = calcularReordenBinomial(n, p, nivelServicio);
		} else {
			R = "Indeterminado";
		}

		// Añadido: Calcular el nivel de seguridad
		const nivelSeguridad = R - EX;

		// Calcular Z para el nivel de reorden R
		const Z_R = (R - EX) / sigmaX;

		// Añadido: Calcular la probabilidad de un stockout
		const probStockout = 1 - ss.cumulativeStdNormalProbability(Z_R);

		// Devolviendo los resultados
		res.status(200).json({
			costoDeCajaInventarioAnual: costoInventario,
			costoEscasez: costoEscasez,
			media: media,
			EOQ: EOQ,
			EX: EX,
			sigmaX: sigmaX,
			desviacionTipica: desviacionTipica,
			demandaAnual: demandaAnual,
			normal: resultadoNormal,
			exponencial: resultadoExponencial,
			binomial: resultadoBinomial,
			R: R,
			nivelSeguridad: nivelSeguridad,
			probStockout: probStockout,
		});
	} catch (error) {
		console.log("Hubo un error al calcular las métricas EOQ:", error);
		res.status(500).json({
			msg: "Hubo un error al calcular las métricas EOQ",
			error,
		});
	}
};


// Función principal para calcular métricas EOQ
const calculateMonteCarloSimulation = async (req, res) => {
	console.log("Inicio de la función calculateEOQMetrics");

	// Recuperando el stock desde el cuerpo de la petición
	const { stock } = req.body;

	const lastYear = moment().subtract(1, "years").toDate();

	try {
		// Obteniendo los movimientos relacionados al stock
		const movimientos = await Movimiento.find({
			stock: stock,
			venta: { $ne: null },
			fecha: { $gte: lastYear },
		});

		let muestras = [];
		movimientos.forEach((mov) => muestras.push(mov.cantidadCajas));
		muestras.sort((a, b) => a - b);

		// Calculando estadísticas descriptivas: media y desviación estándar
		const media = ss.mean(muestras);
		const desviacionTipica = ss.standardDeviation(muestras);

		// Cálculo de la demanda anual
		const demandaAnual = muestras.reduce((a, b) => a + b, 0);

		// Función de distribución acumulativa teórica para la normal
		const F_teo_normal = (x) =>
			ss.cumulativeStdNormalProbability((x - media) / desviacionTipica);

		// Función de distribución acumulativa teórica para la exponencial
		const lambda = 1 / media;
		const F_teo_exponencial = (x) => 1 - Math.exp(-lambda * x);

		// Función de distribución acumulativa teórica para la binomial
		const n = 20;
		const p = 0.5;
		const F_teo_binomial = (x) => binomialCDF(x, n, p);

		// Ejecutando test de Kolmogorov-Smirnov para cada distribución
		const resultadoNormal = testKolmogorov(muestras, F_teo_normal);
		const resultadoExponencial = testKolmogorov(muestras, F_teo_exponencial);
		const resultadoBinomial = testKolmogorov(muestras, F_teo_binomial);




		// Devolviendo los resultados
		res.status(200).json({
			media: media,
			sigmaX: sigmaX,
			desviacionTipica: desviacionTipica,
			demandaAnual: demandaAnual,
			normal: resultadoNormal,
			exponencial: resultadoExponencial,
			binomial: resultadoBinomial,
		});
	} catch (error) {
		console.log("Hubo un error al calcular las métricas EOQ:", error);
		res.status(500).json({
			msg: "Hubo un error al calcular las métricas EOQ",
			error,
		});
	}
};


module.exports = {
	obtenerMovimientos,
	buscarMovimientos,
	obtenerMovimientosPorVenta,
	simularVentas,
	calculateEOQMetrics,
	calculateMonteCarloSimulation,
};
