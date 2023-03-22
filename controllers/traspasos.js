// Importaciones necesarias
const { response } = require("express");
const { Traspaso, Stock, Movimiento, Entrada, Salida } = require("../models");

// Función para obtener todos los traspasos
const obtenerTraspasos = async (req, res = response) => {
	const query = { estado: true };

	// Realiza consultas en paralelo para obtener el total y los traspasos
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
	]);

	// Envía la respuesta con el total y los traspasos
	res.json({
		total,
		traspasos,
	});
};

// Función para crear un nuevo traspaso
// Función para crear un nuevo traspaso
const crearTraspaso = async (req, res = response) => {
	const { estado, usuario, ...body } = req.body;

	// Inicializar variables
	const totalProductos = Object.keys(body.productos).length;
	const arrEntradas = [];
	const arrSalidas = [];

	// Procesar cada producto
	for (let index = 0; index < totalProductos; index++) {
		const destino = body.productos[index].destino;
		const origen = body.productos[index].origen;
		const producto = body.productos[index].producto;

		if (!destino || !origen || !producto) {
			return res.status(400).json({
				message: "Faltan datos requeridos en productos",
			});
		}

		const query = {
			sucursal: destino,
			producto: producto,
		};

		let stock = await Stock.findOne(query);

		// Crear stock si no existe
		if (!stock) {
			const data1 = {
				sucursal: destino,
				producto: producto,
				cantidad: 0,
			};

			const newStock = new Stock(data1);
			await newStock.save();
		}

		// Crear entrada
		const data2 = {
			usuario: req.usuario._id,
			cantidad: body.productos[index].cantidad,
			producto: producto,
			sucursal: destino,
			movimiento: "ENTRADA",
		};

		const entrada = new Movimiento(data2);
		await entrada.save();
		arrEntradas.push(entrada._id);

		// Crear salida
		const data3 = {
			usuario: req.usuario._id,
			cantidad: body.productos[index].cantidad,
			producto: producto,
			sucursal: origen,
			movimiento: "SALIDA",
		};

		const salida = new Movimiento(data3);
		await salida.save();
		arrSalidas.push(salida._id);
	}

	// Crear traspaso
	const data = {
		usuario: req.usuario._id,
		entradas: arrEntradas,
		salidas: arrSalidas,
	};

	const traspaso = new Traspaso(data);

	// Guardar traspaso en la base de datos
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
	// Envía la respuesta con el nuevo traspaso creado
	res.status(201).json(nuevaTraspaso);
};

// Exportar las funciones como módulos
module.exports = {
	obtenerTraspasos,
	crearTraspaso,
};
