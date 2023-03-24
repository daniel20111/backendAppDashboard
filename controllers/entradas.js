const { response } = require("express");
const { Movimiento, Stock } = require("../models");

const obtenerEntradas = async (req, res = response) => {
	const query = { estado: true, movimiento: "ENTRADA" };

	const [total, entradas] = await Promise.all([
		Movimiento.countDocuments(query),
		Movimiento.find(query)
			.sort("-fecha")
			.populate("usuario", "nombre")
			.populate({
				path: "stock",
				populate: [
					{
						path: "producto",
						model: "Producto",
						select: "nombre",
					},
					{
						path: "sucursal",
						model: "Sucursal",
						select: "definicion",
					},
				],
			}),
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
		.populate({
			path: "stock",
			populate: [
				{
					path: "producto",
					model: "Producto",
					select: "nombre",
				},
				{
					path: "sucursal",
					model: "Sucursal",
					select: "definicion",
				},
			],
		})
		.populate("verificado_por", "nombre");

	res.json(entrada);
};

const crearEntrada = async (req, res = response) => {
	const { estado, usuario, ...body } = req.body;

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
		.populate({
			path: "stock",
			populate: [
				{
					path: "producto",
					model: "Producto",
					select: "nombre",
				},
				{
					path: "sucursal",
					model: "Sucursal",
					select: "definicion",
				},
			],
		})
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

	const stock = await Stock.findById(movimiento.stock._id);

	const saldoCajas = stock.cantidadCajas + movimiento.cantidadCajas;
	const saldoPiezas = stock.cantidadPiezas + movimiento.cantidadPiezas;

	// Crear un nuevo objeto con la fecha y cantidad actuales
	const historialItem = {
		fecha: stock.fecha,
		cantidadCajas: stock.cantidadCajas,
		cantidadPiezas: stock.cantidadPiezas,
	};

	// Agregar el objeto historialItem al historial
	stock.historial.push(historialItem);

	// Actualizar la cantidad del stock
	stock.cantidadCajas = saldoCajas;
	stock.cantidadPiezas = saldoPiezas;

	// Guardar el documento de stock actualizado
	await stock.save();

	await movimiento
		.populate("usuario", "nombre")
		.populate({
			path: "stock",
			populate: [
				{
					path: "producto",
					model: "Producto",
					select: "nombre",
				},
				{
					path: "sucursal",
					model: "Sucursal",
					select: "definicion",
				},
			],
		})
		.execPopulate();

	res.json(movimiento);
};

module.exports = {
	obtenerEntradas,
	obtenerEntrada,
	actualizarEntrada,
	crearEntrada,
};
