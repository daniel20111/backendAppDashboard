const { response } = require("express");
const { Stock, Producto, Sucursal } = require("../models");

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
			.populate("sucursal", "definicion"),
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

module.exports = {
	obtenerTodosLosStocks,
	obtenerStocksPorId,
	obtenerStockPorId,
};
