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
		// Obtener ID de la salida desde los parámetros de la petición
		const { id } = req.params;

		// Obtener la información de la salida desde la petición JSON
		const { estado, usuario, ...data } = req.body;

		// Agregar información adicional a la salida
		data.verificado_por = req.usuario._id;
		data.verificacion = "VERIFICADO";
		data.fecha_verificacion = Date.now();

		// Actualizar la salida en la base de datos
		const movimiento = await Movimiento.findByIdAndUpdate(id, data, {
			new: true,
		});

		// Crear una consulta para buscar el stock relacionado con la salida
		const query = {
			sucursal: movimiento.sucursal._id,
			producto: movimiento.producto._id,
		};

		// Buscar el stock relacionado
		const stock = await Stock.findOne(query);

		// Calcular el saldo del stock después de la salida
		const saldo = stock.cantidad - movimiento.cantidad;

		// Crear objeto con la nueva cantidad de stock
		const data1 = {
			cantidad: saldo,
		};

		// Actualizar el stock en la base de datos
		await stock.update(data1);

		// Poblar los campos relacionados antes de devolver el movimiento actualizado
		await movimiento
			.populate("usuario", "nombre")
			.populate("producto", "nombre")
			.populate("sucursal", "definicion")
			.execPopulate();

		// Devolver el movimiento actualizado
		res.json(movimiento);
	} catch (error) {
		// Manejar posibles errores y devolver un mensaje de error
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
