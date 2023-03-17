const { response } = require("express");
const { Movimiento, Stock } = require("../models");

const obtenerEntradas = async (req, res = response) => {
	const query = { estado: true, movimiento: "Entrada" };

	const [total, entradas] = await Promise.all([
		Movimiento.countDocuments(query),
		Movimiento.find(query)
			.sort("-fecha")
			.populate("usuario", "nombre")
			.populate("producto", "nombre"),
	]);

	res.json({
		total,
		entradas,
	});
};

const obtenerEntrada = async (req, res = response) => {
	const { id } = req.params;

	const entrada = await Movimiento.findById(id)
		.populate("usuario", "nombre")
		.populate("producto", "nombre")
		.populate("sucursal", "definicion")
		.populate("verificado_por", "nombre");

	res.json(entrada);
};

const crearEntrada = async (req, res = response) => {
	const { estado, usuario, ...body } = req.body;

	const query = { sucursal: body.sucursal._id, producto: body.producto._id };

	let stock = await Stock.findOne(query);

	if (!stock) {
		const data1 = {
			...body,
			cantidad: 0,
		};

		const newStock = new Stock(data1);
		await newStock.save();
	}

	const data = {
		...body,
		usuario: req.usuario._id,
		cantidad: body.cantidad,
		movimiento: "ENTRADA",
	};

	const entrada = new Movimiento(data);

	const nuevaEntrada = await entrada.save();
	await nuevaEntrada
		.populate("usuario", "nombre")
		.populate("producto", "nombre")
		.populate("sucursal", "definicion")
		.execPopulate();

	res.status(201).json(nuevaEntrada);
};

const actualizarEntrada = async (req, res = response) => {
	const { id } = req.params;
	const { estado, usuario, ...data } = req.body;

	data.verificado_por = req.usuario._id;
	data.verificacion = "VERIFICADO";
	data.fecha_verificacion = Date.now();

	const movimiento = await Movimiento.findByIdAndUpdate(id, data, {
		new: true,
	});

	const query = {
		sucursal: movimiento.sucursal._id,
		producto: movimiento.producto._id,
	};

	const stock = await Stock.findOne(query);

	const saldo = stock.cantidad + movimiento.cantidad;

	const data1 = {
		cantidad: saldo,
	};

	await stock.update(data1);

	await movimiento
		.populate("usuario", "nombre")
		.populate("producto", "nombre")
		.populate("sucursal", "definicion")
		.execPopulate();

	res.json(movimiento);
};

module.exports = {
	obtenerEntradas,
	obtenerEntrada,
	actualizarEntrada,
	crearEntrada,
};
