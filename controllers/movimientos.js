const { Movimiento } = require("../models");
const { Producto } = require("../models");
const { Stock } = require("../models");
const { Usuario } = require("../models");
const mongoose = require("mongoose");
const moment = require("moment");
const ss = require("simple-statistics");
const math = require("mathjs");
const cron = require("node-cron");

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

const calcularReordenUniforme = (a, b, nivelServicio) => {
	return a + (b - a) * nivelServicio;
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

		// Función de distribución acumulativa teórica para la uniforme
		const a = Math.min(...muestras);
		const b = Math.max(...muestras);
		const F_teo_uniforme = (x) => (x - a) / (b - a);

		// Ejecutando test de Kolmogorov-Smirnov para cada distribución
		const resultadoNormal = testKolmogorov(muestras, F_teo_normal);
		const resultadoExponencial = testKolmogorov(muestras, F_teo_exponencial);
		const resultadoUniforme = testKolmogorov(muestras, F_teo_uniforme);

		//Calculando EOQ
		const EOQ = Math.round(
			Math.sqrt((2 * demandaAnual * costoPedido) / costoInventario)
		);

		// Cálculos para E[X] y sigma_X
		const EX = (demandaAnual / semanasAnuales) * leadTime;
		const sigmaX =
			(desviacionTipica / Math.sqrt(semanasAnuales)) * Math.sqrt(leadTime);

		//Calculo del punto de reorden

		let R = "Indeterminado";

		if (resultadoNormal === "Sigue la distribución") {
			const Z = 1.65; // Nivel de confianza para la normal
			R = Math.round(calcularReordenNormal(EX, sigmaX, Z));
		} else if (resultadoExponencial === "Sigue la distribución") {
			const nivelServicio = 0.95; // Nivel de servicio deseado
			R = Math.round(calcularReordenExponencial(lambda, nivelServicio));
		} else if (resultadoUniforme === "Sigue la distribución") {
			const nivelServicio = 0.95; // Nivel de servicio deseado
			R = Math.round(calcularReordenUniforme(a, b, nivelServicio));
		}

		// Añadido: Calcular el nivel de seguridad
		const nivelSeguridad = R - EX;

		// Calcular Z para el nivel de reorden R
		const Z_R = (R - EX) / sigmaX;

		// Añadido: Calcular la probabilidad de un stockout
		const probStockout = 1 - ss.cumulativeStdNormalProbability(Z_R);

		// Actualizar el stock con los resultados
		if (R !== "Indeterminado") {
			await Stock.findByIdAndUpdate(stock, {
				puntoReorden: R,
				EOQ: EOQ,
				nivelSeguridad: nivelSeguridad,
			});
		}

		// Devolviendo los resultados
		res.status(200).json({
			costoDeCajaInventarioAnual: Math.round(costoInventario),
			costoEscasez: Math.round(costoEscasez),
			media: Math.round(media),
			EOQ: Math.round(EOQ),
			EX: Math.round(EX),
			sigmaX: Math.round(sigmaX),
			desviacionTipica: Math.round(desviacionTipica),
			demandaAnual: Math.round(demandaAnual),
			normal: resultadoNormal,
			exponencial: resultadoExponencial,
			uniforme: resultadoUniforme,
			R: Math.round(R),
			nivelSeguridad: Math.round(nivelSeguridad),
			probStockout: Math.round(probStockout * 100), // Si es una probabilidad, podrías querer multiplicarla por 100 para convertirla en un porcentaje
		});
	} catch (error) {
		console.log("Hubo un error al calcular las métricas EOQ:", error);
		res.status(500).json({
			msg: "Hubo un error al calcular las métricas EOQ",
			error,
		});
	}
};

const calculateAllEOQMetrics = async () => {
	try {
		const allStocks = await Stock.find().populate("producto", "precioCaja");
		const results = [];

		for (const stock of allStocks) {
			const leadTime = 1; // en semanas
			const costoPedido = 120; // en bolivianos
			const costoInventario = stock.producto.precioCaja * 0.05; // en bolivianos por caja por año
			const costoEscasez = stock.producto.precioCaja * 0.5; // en bolivianos
			const semanasAnuales = 52; // semanas en un año
			const lastYear = moment().subtract(1, "years").toDate();

			const movimientos = await Movimiento.find({
				stock: stock._id,
				venta: { $ne: null },
				fecha: { $gte: lastYear },
			});

			let muestras = [];
			movimientos.forEach((mov) => muestras.push(mov.cantidadCajas));
			muestras.sort((a, b) => a - b);

			if (muestras.length === 0) {
				console.log(
					`No hay datos suficientes para el stock con ID ${stock._id}`
				);
				continue; // Saltar a la siguiente iteración del bucle
			}

			const media = ss.mean(muestras);
			const desviacionTipica = ss.standardDeviation(muestras);
			const demandaAnual = muestras.reduce((a, b) => a + b, 0);

			const EOQ = Math.round(
				Math.sqrt((2 * demandaAnual * costoPedido) / costoInventario)
			);

			const EX = (demandaAnual / semanasAnuales) * leadTime;
			const sigmaX =
				(desviacionTipica / Math.sqrt(semanasAnuales)) * Math.sqrt(leadTime);

			// Función de distribución acumulativa teórica para la normal
			const F_teo_normal = (x) =>
				ss.cumulativeStdNormalProbability((x - media) / desviacionTipica);

			// Función de distribución acumulativa teórica para la exponencial
			const lambda = 1 / media;
			const F_teo_exponencial = (x) => 1 - Math.exp(-lambda * x);

			// Función de distribución acumulativa teórica para la uniforme
			const a = Math.min(...muestras);
			const b = Math.max(...muestras);
			const F_teo_uniforme = (x) => (x - a) / (b - a);

			// Ejecutando test de Kolmogorov-Smirnov para cada distribución
			const resultadoNormal = testKolmogorov(muestras, F_teo_normal);
			const resultadoExponencial = testKolmogorov(muestras, F_teo_exponencial);
			const resultadoUniforme = testKolmogorov(muestras, F_teo_uniforme);

			let R = "Indeterminado";

			if (resultadoNormal === "Sigue la distribución") {
				const Z = 1.65; // Nivel de confianza para la normal
				R = Math.round(calcularReordenNormal(EX, sigmaX, Z));
			} else if (resultadoExponencial === "Sigue la distribución") {
				const nivelServicio = 0.95; // Nivel de servicio deseado
				R = Math.round(calcularReordenExponencial(lambda, nivelServicio));
			} else if (resultadoUniforme === "Sigue la distribución") {
				const nivelServicio = 0.95; // Nivel de servicio deseado
				R = Math.round(calcularReordenUniforme(a, b, nivelServicio));
			}

			// Añadido: Calcular el nivel de seguridad
			const nivelSeguridad = Math.round(R - EX);

			const nivelSeguridadCorregido = Object.is(nivelSeguridad, -0)
				? 0
				: nivelSeguridad;

			// Calcular Z para el nivel de reorden R
			const Z_R = (R - EX) / sigmaX;

			// Añadido: Calcular la probabilidad de un stockout
			const probStockout = 1 - ss.cumulativeStdNormalProbability(Z_R);

			const eoqResult = {
				stockId: stock._id,
				EOQ: EOQ,
				R: R,
				nivelSeguridad: nivelSeguridadCorregido,
				probStockout: probStockout,
			};

			results.push(eoqResult);

			// Actualizar el stock con los resultados
			if (R !== "Indeterminado") {
				await Stock.findByIdAndUpdate(stock._id, {
					puntoReorden: R,
					eoq: EOQ,
					nivelSeguridad: nivelSeguridadCorregido,
				});
			}
		}

		console.log(results);
		// Aquí podrías guardar los resultados en la base de datos o hacer algo más con ellos
	} catch (error) {
		console.log(
			"Hubo un error al calcular las métricas EOQ para todos los stocks:",
			error
		);
	}
};

// Simulación de movimientos
const simulateMovements = async (req, res) => {
	let movements = [];

	for (let i = 0; i < 200; i++) {
		const [randomStock] = await Stock.aggregate([{ $sample: { size: 1 } }]);
		const [randomUser] = await Usuario.aggregate([{ $sample: { size: 1 } }]);
		const [randomVerifier] = await Usuario.aggregate([
			{ $sample: { size: 1 } },
		]);

		const createdAt = moment()
			.subtract(Math.random() * 60, "days")
			.add(Math.floor(Math.random() * 24), "hours")
			.add(Math.floor(Math.random() * 60), "minutes");
		const verificationDays = Math.floor(Math.random() * 10);
		const fechaVerificacion = moment(createdAt).add(
			5 + verificationDays,
			"days"
		);

		let randomType, randomVerification, cantidadCajas;
		const randomPercentage = Math.random() * 100;

		// Tipo de movimiento
		if (randomPercentage < 30) {
			randomType = "ENTRADA";
		} else if (randomPercentage < 95) {
			randomType = "SALIDA";
		} else {
			randomType = "MERMA";
		}

		// Verificación y cantidad de cajas según el tipo
		const verificationChance = Math.random() * 100;
		if (randomType === "ENTRADA") {
			if (verificationChance < 5) {
				randomVerification = "ERROR";
			} else if (verificationChance < 90) {
				randomVerification = "VERIFICADO";
			} else {
				randomVerification = "EN ESPERA";
			}
			cantidadCajas = Math.floor(70 + (Math.random() - 0.5) * 2 * 15);
		} else if (randomType === "SALIDA") {
			if (verificationChance < 5) {
				randomVerification = "ERROR";
			} else if (verificationChance < 100) {
				randomVerification = "VERIFICADO";
			} else {
				randomVerification = "EN ESPERA";
			}
			cantidadCajas = Math.floor(50 + (Math.random() - 0.5) * 2 * 10);
		} else {
			randomVerification = "VERIFICADO"; // 100% verificado para "MERMA"
			cantidadCajas = Math.floor(5 + (Math.random() - 0.5) * 2 * 3);
		}

		const newMovement = {
			estado: true,
			usuario: mongoose.Types.ObjectId(randomUser._id),
			verificado_por: mongoose.Types.ObjectId(randomVerifier._id),
			cantidadCajas: cantidadCajas,
			movimiento: randomType,
			fecha_verificacion: fechaVerificacion.toDate(),
			verificacion: randomVerification,
			stock: mongoose.Types.ObjectId(randomStock._id),
			fecha: createdAt.toDate(),
		};

		movements.push(newMovement);
	}

	await Movimiento.insertMany(movements);
	console.log("Movimientos insertados");
};
//cron.schedule("*/1 * * * *", calculateAllEOQMetrics);

//cron.schedule("*/1 * * * *", simulateMovements);

module.exports = {
	obtenerMovimientos,
	buscarMovimientos,
	obtenerMovimientosPorVenta,
	simularVentas,
	calculateEOQMetrics,
	calculateAllEOQMetrics,
	simulateMovements,
};
