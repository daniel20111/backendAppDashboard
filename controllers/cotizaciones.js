const { Cotizacion } = require("../models"); // Asegúrate de importar el modelo Cotizacion

// Función para obtener todas las cotizaciones de la base de datos
const obtenerCotizaciones = async (req, res) => {
	const query = { estado: true };

	try {
		// Buscar todas las cotizaciones en la base de datos
		const cotizaciones = await Cotizacion.find(query)
			.sort({ fecha: -1 })
			.populate("usuario", "nombre")
			.populate("sucursal", "definicion")
			.populate({
				path: "productos.producto",
				model: "Producto",
				populate: [
					{
						path: "usuario",
						model: "Usuario",
						select: "nombre",
					},
					{
						path: "categoria",
						model: "Categoria",
						select: "nombre",
					},
				],
			});

		// Calcular el total de cotizaciones
		const total = cotizaciones.length;

		// Devolver una respuesta exitosa con el listado de cotizaciones y el total
		res.status(200).json({
			message: "Cotizaciones obtenidas con éxito",
			cotizaciones,
			total,
		});
	} catch (error) {
		// Manejar posibles errores y devolver un mensaje de error
		res.status(500).json({
			message: "Ocurrió un error al obtener las cotizaciones",
			error,
		});
	}
};

// Función para obtener una cotización por su ID
const obtenerCotizacionPorId = async (req, res) => {
	try {
		// Extraer el ID de la cotización desde los parámetros de la petición
		const { id } = req.params;

		// Buscar la cotización con el ID especificado en la base de datos
		const cotizacion = await Cotizacion.findById(id)
			.populate("usuario", "nombre")
			.populate("sucursal", "nombre")
			.populate({
				path: "productos.producto",
				model: "Producto",
				select: "nombre",
			});

		// Verificar si se encontró la cotización
		if (!cotizacion) {
			return res.status(404).json({
				message: "Cotización no encontrada",
			});
		}

		// Devolver una respuesta exitosa con la cotización encontrada
		res.status(200).json({
			message: "Cotización obtenida con éxito",
			cotizacion,
		});
	} catch (error) {
		// Manejar posibles errores y devolver un mensaje de error
		res.status(500).json({
			message: "Ocurrió un error al obtener la cotización",
			error,
		});
	}
};

// Función para crear una nueva cotización y guardarla en la base de datos
const crearCotizacion = async (req, res) => {
	try {
		// Obtener la información de la cotización desde la petición JSON
		const { cliente, nit, fecha, productos } = req.body;

		// Verificar que los campos requeridos estén presentes
		if (!cliente || !productos) {
			return res.status(400).json({
				message: "Faltan campos requeridos",
			});
		}

		// Extraer el ID del usuario desde la petición
		const usuario = req.usuario._id;

		const sucursal = req.usuario.sucursal._id;

		// Calcular el total de la cotización
		const total = productos.reduce(
			(acc, producto) => acc + producto.precioTotal,
			0
		);

		// Crear una nueva instancia de Cotizacion con la información proporcionada
		const nuevaCotizacion = new Cotizacion({
			usuario,
			cliente,
			nit,
			sucursal,
			fecha,
			productos,
			total,
		});

		// Guardar la nueva cotización en la base de datos
		await nuevaCotizacion.save();

		// Poblar los campos necesarios
		await nuevaCotizacion
			.populate("usuario", "nombre")
			.populate("sucursal", "definicion")
			.populate({
				path: "productos.producto",
				model: "Producto",
				populate: [
					{
						path: "usuario",
						model: "Usuario",
						select: "nombre",
					},
					{
						path: "categoria",
						model: "Categoria",
						select: "nombre",
					},
				],
			})
			.execPopulate();

		// Devolver una respuesta exitosa con la cotización creada
		res.status(201).json(nuevaCotizacion);
	} catch (error) {
		// Manejar posibles errores y devolver un mensaje de error
		res.status(500).json({
			message: "Ocurrió un error al crear la cotización",
			error,
		});
	}
};

//Funcion para actualizar una cotizacion
const actualizarCotizacion = async (req, res) => {
	try {
		// Extraer el ID de la cotización desde los parámetros de la petición
		const { id } = req.params;

		// Obtener la información de la cotización desde la petición JSON

		const { cliente, nit, fecha, productos } = req.body;

		// Verificar que los campos requeridos estén presentes

		if (!cliente || !productos) {
			return res.status(400).json({
				message: "Faltan campos requeridos",
			});
		}

		// Calcular el total de la cotización

		const total = productos.reduce(
			(acc, producto) => acc + producto.precioTotal,
			0
		);

		// Buscar la cotización con el ID especificado en la base de datos

		const cotizacion = await Cotizacion.findById(id);

		// Verificar si se encontró la cotización

		if (!cotizacion) {
			return res.status(404).json({
				message: "Cotización no encontrada",
			});
		}

		// Actualizar la cotización con la información proporcionada

		cotizacion.cliente = cliente;
		cotizacion.nit = nit;
		cotizacion.productos = productos;
		cotizacion.total = total;

		// Guardar los cambios realizados en la cotización

		await cotizacion.save();

		// Poblar los campos necesarios

		await cotizacion
			.populate("usuario", "nombre")
			.populate("sucursal", "definicion")
			.populate({
				path: "productos.producto",
				model: "Producto",
				populate: [
					{
						path: "usuario",
						model: "Usuario",
						select: "nombre",
					},
					{
						path: "categoria",
						model: "Categoria",
						select: "nombre",
					},
				],
			})
			.execPopulate();

		// Devolver una respuesta exitosa con la cotización actualizada

		res.status(200).json({
			message: "Cotización actualizada con éxito",
			cotizacion,
		});
	} catch (error) {
		// Manejar posibles errores y devolver un mensaje de error

		res.status(500).json({
			message: "Ocurrió un error al actualizar la cotización",
			error,
		});
	}
};

// Exportar la función para utilizarla en otros módulos
module.exports = {
	crearCotizacion,
	obtenerCotizaciones,
	obtenerCotizacionPorId,
	actualizarCotizacion,
};
