// Importaciones necesarias
const { response } = require("express");
const { Traspaso, Stock, Movimiento, Entrada, Salida } = require("../models");

// Función para obtener todos los traspasos
const obtenerTraspasos = async (req, res = response) => {
	const query = { estado: true };

	const [total, traspasos] = await Promise.all([
		Traspaso.countDocuments(query),
		Traspaso.find(query)
			.sort({ fecha: -1 })
			.populate("usuario", "nombre")
			.populate({
				path: "entradas",
				select: "stock cantidadCajas cantidadPiezas verificacion",
				populate: {
					path: "stock",
					model: "Stock",
					populate: [
						{ path: "producto", model: "Producto", select: "nombre img" },
						{ path: "sucursal", model: "Sucursal", select: "municipio" },
					],
				},
			})
			.populate({
				path: "salidas",
				select: "stock cantidadCajas cantidadPiezas verificacion",
				populate: {
					path: "stock",
					model: "Stock",
					populate: [
						{ path: "producto", model: "Producto", select: "nombre img" },
						{ path: "sucursal", model: "Sucursal", select: "municipio" },
					],
				},
			}),
	]);

	if (!total || !traspasos) {
		return res.status(500).json({
			message: "Error al obtener traspasos",
		});
	}

	res.json({
		total,
		traspasos,
	});
};

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

		// Crear entrada
		const data2 = {
			usuario: req.usuario._id,
			cantidadCajas: body.productos[index].cajas,
			cantidadPiezas: body.productos[index].piezas,
			movimiento: "ENTRADA",
			stock: destino,
		};

		const entrada = new Movimiento(data2);
		await entrada.save();
		arrEntradas.push(entrada._id);

		// Crear salida
		const data3 = {
			usuario: req.usuario._id,
			cantidadCajas: body.productos[index].cajas,
			cantidadPiezas: body.productos[index].piezas,
			movimiento: "SALIDA",
			stock: origen,
		};

		//actualizar datos de reserva de stock en origen
		const stockOrigen = await Stock.findById(origen);
		stockOrigen.reservadoCajas += body.productos[index].cajas;
		stockOrigen.reservadoPiezas += body.productos[index].piezas;
		await stockOrigen.save();

		const stockDestino = await Stock.findById(destino);
		stockDestino.entranteCajas += body.productos[index].cajas;
		stockDestino.entrantePiezas += body.productos[index].piezas;
		await stockDestino.save();

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
			select: "cantidadCajas cantidadPiezas stock verificacion",
			populate: [
				{
					path: "stock",
					model: "Stock",
					populate: {
						path: "producto",
						model: "Producto",
						select: "nombre img",
					},
				},
				{
					path: "stock",
					model: "Stock",
					populate: {
						path: "sucursal",
						model: "Sucursal",
						select: "municipio",
					},
				},
			],
		})
		.populate({
			path: "salidas",
			select: "cantidadCajas cantidadPiezas stock verificacion",
			populate: [
				{
					path: "stock",
					model: "Stock",
					populate: {
						path: "producto",
						model: "Producto",
						select: "nombre img",
					},
				},
				{
					path: "stock",
					model: "Stock",
					populate: {
						path: "sucursal",
						model: "Sucursal",
						select: "municipio",
					},
				},
			],
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
