const { response } = require("express");
const { Stock } = require("../models");

const obtenerTodosLosStocks = async (req, res = response) => {
	const query = {};

	const [total, listaStocks] = await Promise.all([
		Stock.countDocuments(query),
		Stock.find(query)
			.populate("producto", "nombre")
			.populate("sucursal", "nombre"),
	]);

	res.json({
		total,
		listaStocks,
	});
};

const obtenerStocksPorId = async (req, res = response) => {
	const { id } = req.params;

	const query = {
		$or: [{ producto: id }, { sucursal: id }],
	};

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

module.exports = {
	obtenerTodosLosStocks,
	obtenerStocksPorId,
};
