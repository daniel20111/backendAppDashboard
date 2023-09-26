const { response } = require("express");
const { Stock, Producto, Sucursal } = require("../models");
const cron = require("node-cron");

const getRandomInt = (min, max) =>
	Math.floor(Math.random() * (max - min + 1)) + min;

const generateRandomDate = (start, end) =>
	new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const generateRandomHistorial = () => {
	const numEntries = getRandomInt(30, 50);
	const today = new Date();
	const twoYearsAgo = new Date();
	twoYearsAgo.setFullYear(today.getFullYear() - 2);

	let currentStock = 100; // Inicializa el stock actual
	const historial = [];

	for (let i = 0; i < numEntries; i++) {
		const fecha = generateRandomDate(twoYearsAgo, today);

		// Simula una tendencia: aumenta o disminuye el stock en un 5-10%
		const trendFactor = getRandomInt(95, 105) / 100;
		currentStock = Math.round(currentStock * trendFactor);

		// Simula un evento: una venta grande o una entrega de stock
		if (Math.random() < 0.1) {
			const eventFactor = getRandomInt(80, 120) / 100;
			currentStock = Math.round(currentStock * eventFactor);
		}

		// Asegura que el stock no sea negativo
		currentStock = Math.max(0, currentStock);

		historial.push({
			fecha,
			cantidadCajas: currentStock,
		});
	}

	return historial;
};

// Función para obtener todos los stocks de la base de datos
const obtenerTodosLosStocks = async (req, res = response) => {
	const query = {};

	const [total, stocks] = await Promise.all([
		Stock.countDocuments(query),
		Stock.find(query)
			.populate("producto", "nombre img categoria usuario")
			.populate({
				path: "producto",
				populate: [
					{
						path: "categoria",
						select: "nombre",
					},
					{
						path: "usuario",
						select: "nombre",
					},
				],
			})
			.populate("sucursal", "municipio"),
	]);

	res.json({
		total,
		stocks,
	});
};

const obtenerStocksPorId = async (req, res = response) => {
	const { id } = req.params;

	// Consultas iniciales para determinar si el ID corresponde a un producto o una sucursal
	const [producto, sucursal] = await Promise.all([
		Producto.findById(id),
		Sucursal.findById(id),
	]);

	console.log("Producto:", producto);
	console.log("Sucursal:", sucursal);

	let query;

	// Determinar si el ID corresponde a un producto o una sucursal y construir la consulta adecuada
	if (producto) {
		query = { producto: id };
	} else if (sucursal) {
		query = { sucursal: id };
	} else {
		// Si el ID no corresponde a un producto ni a una sucursal, envía un mensaje de error
		return res.status(404).json({
			message: "No se encontró un producto o sucursal con el ID proporcionado.",
		});
	}

	// Realizar la consulta para obtener los stocks que coincidan con el ID proporcionado
	const [total, stocks] = await Promise.all([
		Stock.countDocuments(query),
		Stock.find(query)
			.populate("producto", "nombre")
			.populate("sucursal", "nombre"),
	]);

	res.json({
		total,
		stocks,
	});
};

const obtenerStockPorId = async (req, res) => {
	const { id } = req.params;

	try {
		const stock = await Stock.findById(id)
			.populate("producto", "nombre")
			.populate("sucursal", "nombre");

		if (!stock) {
			return res.status(404).json({
				msg: `No se encontró un stock con el ID ${id}`,
			});
		}

		res.json({
			stock,
		});
	} catch (error) {
		console.error("Error al obtener stock por ID:", error);
		res.status(500).json({
			msg: "Ocurrió un error al obtener el stock. Por favor, inténtalo de nuevo.",
		});
	}
};

const poblarHistorialAleatorio = async (req, res = response) => {
	const session = await Stock.startSession();
	session.startTransaction();

	try {
		const { id } = req.params; // ID del stock que quieres actualizar

		const stock = await Stock.findById(id).session(session);

		if (!stock) {
			await session.abortTransaction();
			session.endSession();
			return res.status(404).json({
				msg: `No se encontró un stock con el ID ${id}`,
			});
		}

		// Generar un historial aleatorio y actualizar el documento
		stock.historial = generateRandomHistorial();
		await stock.save({ session });

		await session.commitTransaction();
		session.endSession();

		res.json({
			msg: "Historial actualizado exitosamente",
			stock,
		});
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		console.error("Error al poblar el historial:", error);
		res.status(500).json({
			msg: "Ocurrió un error al poblar el historial. Por favor, inténtalo de nuevo.",
		});
	}
};

// Función para actualizar un solo stock
const actualizarUnStock = async (id) => {
	try {
		const stock = await Stock.findById(id);

		if (!stock) {
			console.warn(`No se encontró un stock con el ID ${id}`);
			return;
		}

		const pipeline = [
			{
				$match: {
					_id: stock._id,
				},
			},
			{
				$unwind: "$historial",
			},
			{
				$group: {
					_id: {
						year: { $year: "$historial.fecha" },
						month: { $month: "$historial.fecha" },
					},
					totalCajas: { $sum: "$historial.cantidadCajas" },
				},
			},
			{
				$sort: {
					"_id.year": 1,
					"_id.month": 1,
				},
			},
		];

		const estadisticasMensuales = await Stock.aggregate(pipeline);

		stock.estadisticasMensuales = estadisticasMensuales.map((item) => ({
			year: item._id.year,
			month: item._id.month,
			totalCajas: item.totalCajas,
		}));

		await stock.save();

		console.log(
			`Estadísticas mensuales para el stock ${id} actualizadas exitosamente`
		);
	} catch (error) {
		console.error(
			`Error al actualizar las estadísticas mensuales para el stock ${id}:`,
			error
		);
	}
};

// Función para actualizar todos los stocks
const actualizarTodosLosStocks = async () => {
	try {
		const stocks = await Stock.find();

		for (const stock of stocks) {
			await actualizarUnStock(stock._id);
		}

		console.log("Todas las estadísticas se actualizaron exitosamente.");
	} catch (error) {
		console.error("Error al actualizar todas las estadísticas:", error);
	}
};

// Programar la tarea para que se ejecute cada cierto tiempo (por ejemplo, cada día a las 2 a.m.)
//cron.schedule("*/5 * * * *", actualizarTodosLosStocks);

module.exports = {
	obtenerTodosLosStocks,
	obtenerStocksPorId,
	obtenerStockPorId,
	poblarHistorialAleatorio,
};
