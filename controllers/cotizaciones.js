const { response } = require("express");
const { Cotizacion } = require("../models");

const obtenerCotizaciones = async (req, res = response) => {
	const query = { estado: true };

	const [total, cotizaciones] = await Promise.all([
		Cotizacion.countDocuments(query),
		Cotizacion.find(query)
			.sort("-fecha")
			.populate("usuario", "nombre")
			.populate("producto", "nombre"),
		//.skip(Number(desde))
		//.limit(Number(limite)),
	]);

	res.json({
		total,
		cotizaciones,
	});
};
const crearCotizacion = async (req, res = response) => {
	const { estado, usuario, ...body } = req.body;

	// Generar la data a guardar
	let total = Object.keys(body.productos).length;
	const arrEntradas = [];
	const arrSalidas = [];

	for (let index = 0; index < total; index++) {

		const data2 = {
			usuario: req.usuario._id,
			cantidad: body.productos[index].cantidad,
			producto: body.productos[index].producto,
			sucursal: body.productos[index].destino,
			movimiento: "ENTRADA",
		};

		const entrada = new Movimiento(data2);
		await entrada.save();

		arrEntradas.push(entrada._id);

		const data3 = {
			usuario: req.usuario._id,
			cantidad: body.productos[index].cantidad,
			producto: body.productos[index].producto,
			sucursal: body.productos[index].origen,
			movimiento: "SALIDA",
		};
		const salida = new Movimiento(data3);
		await salida.save();

		arrSalidas.push(salida._id);
	}
	console.log(arrEntradas);

	const data = {
		usuario: req.usuario._id,
		entradas: arrEntradas,
		salidas: arrSalidas,
	};

	const traspaso = new Traspaso(data);

	// Guardar DB
	const nuevaTraspaso = await traspaso.save();
	await nuevaTraspaso
		.populate("usuario", "nombre")
		.populate({
			path: "entradas",
			select: "producto cantidad sucursal",
			populate: { path: "producto", model: "Producto", select: "nombre" },
		})
		.populate({
			path: "salidas",
			select: "producto cantidad sucursal",
			populate: { path: "producto", model: "Producto", select: "nombre" },
		})
		.execPopulate();

	res.status(201).json(nuevaTraspaso);
};
module.exports = {
	obtenerCotizaciones,
    crearCotizacion
};
