const { response } = require("express");
const { Movimiento } = require("../models");

const obtenerSalidas = async (req, res = response) => {
	//const { limite = 10, desde = 0 } = req.query;
	const query = { estado: true, movimiento: "SALIDA" };

	const [total, salidas] = await Promise.all([
		Movimiento.countDocuments(query),
		Movimiento.find(query)
			.sort("-fecha")
			.populate("usuario", "nombre")
			.populate("producto", "nombre"),
		//.skip(Number(desde))
		//.limit(Number(limite)),
	]);

	res.json({
		total,
		salidas,
	});
};

const obtenerSalida = async (req, res = response) => {
	const { id } = req.params;

	const entrada = await Movimiento.findById(id)
		.populate("usuario", "nombre")
		.populate("producto", "nombre")
		.populate("sucursal", "definicion")
		.populate("verificado_por", "nombre");

	res.json(entrada);
};

const crearSalida = async (req, res = response) => {
	const { estado, usuario, ...body } = req.body;

	// Generar la data a guardar
	const data = {
		...body,
		usuario: req.usuario._id,
		cantidad: body.cantidad,
	};

	const salida = new Movimiento(data);

	// Guardar DB
	const nuevaSalida = await salida.save();
	await nuevaSalida
		.populate("usuario", "nombre")
		.populate("producto", "nombre")
		.execPopulate();

	res.status(201).json(nuevaSalida);
};

const actualizarSalida = async (req, res = response) => {
	const { id } = req.params;
	const { estado, usuario, ...data } = req.body;

	data.verificado_por = req.usuario._id;

	const movimiento = await Movimiento.findByIdAndUpdate(id, data, {
		new: true,
	});

	const query = {
		sucursal: movimiento.sucursal._id,
		producto: movimiento.producto._id,
	};

	const stock = await Stock.findOne(query);

	const saldo = stock.cantidad - movimiento.cantidad;

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

/*const borrarProducto = async (req, res = response) => {
  const { id } = req.params;
  const productoBorrado = await Producto.findByIdAndUpdate(
    id,
    { estado: false },
    { new: true }
  );

  res.json(productoBorrado);
};*/

module.exports = {
	obtenerSalidas,
	actualizarSalida,
	crearSalida,
};
