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
				.populate({
					path: "verificado_por",
					model: "Usuario",
					select: "nombre",
				}), // Agregar esta línea para incluir datos de verificado_por
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
			movimiento: "SALIDA",
		};

		// Crear una nueva instancia de Movimiento con la información proporcionada
		const salida = new Movimiento(data);
		const stock = await Stock.findById(movimiento.stock._id);

		// Actualizar reserva del stock
		stock.reservadoCajas -= movimiento.cantidadCajas;
		stock.reservadoPiezas -= movimiento.cantidadPiezas;

		// Guardar la nueva salida en la base de datos
		const nuevaSalida = await salida.save();
		await nuevaSalida
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

		// Actualiza la salida con los nuevos datos
		const movimiento = await Movimiento.findByIdAndUpdate(id, data, {
			new: true,
		});

		const stock = await Stock.findById(movimiento.stock._id);

		stock.reservadoCajas -= movimiento.cantidadCajas;
		stock.reservadoPiezas -= movimiento.cantidadPiezas;

		stock.cantidadCajas -= movimiento.cantidadCajas;
		stock.cantidadPiezas -= movimiento.cantidadPiezas;

		if (stock.cantidadPiezas < 0) {
			stock.cantidadCajas -= 1;
			stock.cantidadPiezas += stock.producto.categoria.unidadesPorCaja;
		}

		if (stock.cantidadCajas < 0 || stock.cantidadPiezas < 0) {
			return res.status(400).json({
				message:
					"La cantidad de cajas o piezas enviada es mayor que la cantidad disponible en el stock",
			});
		}

		// Guardar el documento de stock actualizado
		await stock.save();

		const historialItem = {
			fecha: stock.fecha,
			cantidad: stock.cantidad,
		};

		// Agregar el objeto historialItem al historial
		stock.historial.push(historialItem);

		// Guardar el documento de stock actualizado
		await stock.save();

		// Actualizar el movimiento ya con los datos de las relaciones.
		const movimientoActualizado = await Movimiento.findById(movimiento._id)
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
			.populate({
				path: "verificado_por",
				model: "Usuario",
				select: "nombre",
			});

		res.json(movimientoActualizado);
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
