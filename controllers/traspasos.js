const { response } = require("express");
const { Traspaso, Stock, Movimiento } = require("../models");
const { Entrada } = require("../models");
const { Salida } = require("../models");

const obtenerTraspasos = async (req, res = response) => {
	//const { limite = 10, desde = 0 } = req.query;
	const query = { estado: true };

	const [total, traspasos] = await Promise.all([
		Traspaso.countDocuments(query),
		Traspaso.find(query)
			.populate("usuario", "nombre")
			.populate({
				path: "entradas",
				select: "producto cantidad",
				populate: { path: "producto", model: "Producto", select: "nombre" },
			})
			.populate({
				path: "salidas",
				select: "producto cantidad",
				populate: { path: "producto", model: "Producto", select: "nombre" },
			}),
		//.skip(Number(desde))
		//.limit(Number(limite)),
	]);

	res.json({
		total,
		traspasos,
	});
};

const crearTraspaso = async (req, res = response) => {
	const { estado, usuario, ...body } = req.body;

	// Generar la data a guardar
	let total = Object.keys(body.productos).length;
	const arrEntradas = [];
	const arrSalidas = [];

	for (let index = 0; index < total; index++) {
		const query = {
			sucursal: body.productos[index].destino,
			producto: body.productos[index].producto,
		};

		let stock = await Stock.findOne(query);

		if (!stock) {
			const data1 = {
				sucursal: body.productos[index].destino,
				producto: body.productos[index].producto,
				cantidad: 0,
			};

			const newStock = new Stock(data1);
			await newStock.save();
		}

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

/*const actualizarProducto = async (req, res = response) => {
  const { id } = req.params;
  const { estado, usuario, ...data } = req.body;

  data.usuario = req.usuario._id;

  const producto = await Producto.findByIdAndUpdate(id, data, { new: true });

  await producto
    .populate("usuario", "nombre")
    .populate("categoria", "nombre")
    .execPopulate();

  res.json(producto);
};

const borrarProducto = async (req, res = response) => {
  const { id } = req.params;
  const productoBorrado = await Producto.findByIdAndUpdate(
    id,
    { estado: false },
    { new: true }
  );

  res.json(productoBorrado);
};*/

module.exports = {
	obtenerTraspasos,
	crearTraspaso,
};
