const { response } = require("express");
const { Movimiento, Stock } = require("../models");

// Función para obtener todas las salidas
const obtenerSalidas = async (req, res = response) => {
	try {
		const query = { estado: true, movimiento: "SALIDA" };

		// Obtener el total de salidas y la lista de salidas
		const [total, salidas] = await Promise.all([
			Movimiento.countDocuments(query),
			Movimiento.find(query)
				.sort("-fecha")
				.populate("usuario", "nombre")
				.populate("producto", "nombre"),
		]);

		// Devolver la lista de salidas y el total
		res.json({
			total,
			salidas,
		});
	} catch (error) {
		// Manejar posibles errores y devolver un mensaje de error
		res.status(500).json({
			message: "Error al obtener salidas",
			error,
		});
	}
};

// Función para obtener una salida por su ID
const obtenerSalida = async (req, res = response) => {
	try {
		const { id } = req.params;

		// Buscar la salida por ID y poblar los campos relacionados
		const salida = await Movimiento.findById(id)
			.populate("usuario", "nombre")
			.populate("producto", "nombre")
			.populate("sucursal", "definicion")
			.populate("verificado_por", "nombre");

		// Devolver la salida encontrada
		res.json(salida);
	} catch (error) {
		// Manejar posibles errores y devolver un mensaje de error
		res.status(500).json({
			message: "Error al obtener salida",
			error,
		});
	}
};

// Función para crear una nueva salida
const crearSalida = async (req, res = response) => {
	try {
		const { estado, usuario, ...body } = req.body;

		// Preparar la información de la nueva salida
		const data = {
			...body,
			usuario: req.usuario._id,
			cantidad: body.cantidad,
			movimiento: "SALIDA",
		};

		// Crear una nueva instancia de Movimiento con la información proporcionada
		const salida = new Movimiento(data);

		// Guardar la nueva salida en la base de datos
		const nuevaSalida = await salida.save();
		await nuevaSalida
			.populate("usuario", "nombre")
			.populate("producto", "nombre")
			.execPopulate();

		// Devolver una respuesta exitosa con la salida creada
		res.status(201).json(nuevaSalida);
	} catch (error) {
		// Manejar posibles errores y devolver un mensaje de error
		res.status(500).json({
			message: "Error al crear salida",
			error,
		});
	}
};

// Función para actualizar una salida

const actualizarSalida = async (req, res = response) => {
	try {
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

		const saldo = stock.cantidad - movimiento.cantidad;

		// Crear un nuevo objeto con la fecha y cantidad actuales
		const historialItem = {
			fecha: stock.fecha,
			cantidad: stock.cantidad,
		};

		// Agregar el objeto historialItem al historial
		stock.historial.push(historialItem);

		// Actualizar la cantidad del stock
		stock.cantidad = saldo;

		// Guardar el documento de stock actualizado
		await stock.save();

		await movimiento
			.populate("usuario", "nombre")
			.populate("producto", "nombre")
			.populate("sucursal", "definicion")
			.execPopulate();

		res.json(movimiento);
	} catch (error) {
		res.status(500).json({
			message: "Error al actualizar salida",
			error,
		});
	}
};
// Exportar las funciones para ser utilizadas en otros módulos
module.exports = {
	obtenerSalidas,
	obtenerSalida,
	actualizarSalida,
	crearSalida,
};
