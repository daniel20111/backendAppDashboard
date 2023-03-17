const { Cotizacion } = require("../models"); // Asegúrate de importar el modelo Cotizacion

// Función para obtener todas las cotizaciones de la base de datos
const obtenerCotizaciones = async (req, res) => {
	try {
		// Buscar todas las cotizaciones en la base de datos
		const cotizaciones = await Cotizacion.find()
			.populate("usuario", "nombre")
			.populate("sucursal", "nombre")
			.populate({
				path: "productos.producto",
				model: "Producto",
				select: "nombre",
			});

		// Devolver una respuesta exitosa con el listado de cotizaciones
		res.status(200).json({
			message: "Cotizaciones obtenidas con éxito",
			cotizaciones,
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
		const { cliente, sucursal, fecha, productos } = req.body;

		// Extraer el ID del usuario desde la petición
		const usuario = req.usuario._id;

		// Calcular el total de la cotización
		const total = productos.reduce((acc, producto) => acc + producto.total, 0);

		// Crear una nueva instancia de Cotizacion con la información proporcionada
		const nuevaCotizacion = new Cotizacion({
			usuario,
			cliente,
			sucursal,
			fecha,
			productos,
			total,
		});

		// Guardar la nueva cotización en la base de datos
		await nuevaCotizacion.save();

		// Cambiar el estado de la cotización a false después de 48 horas
		cambiarEstadoCotizacion(nuevaCotizacion._id);

		// Devolver una respuesta exitosa con la cotización creada
		res.status(201).json({
			message: "Cotización creada con éxito",
			cotizacion: nuevaCotizacion,
		});
	} catch (error) {
		// Manejar posibles errores y devolver un mensaje de error
		res.status(500).json({
			message: "Ocurrió un error al crear la cotización",
			error,
		});
	}
};

// Función para cambiar el estado de una cotización a false después de 48 horas
const cambiarEstadoCotizacion = async (cotizacionId) => {
  // Establecer un temporizador de 48 horas (48 * 60 * 60 * 1000 milisegundos)
  setTimeout(async () => {
    try {
      // Buscar y actualizar el estado de la cotización en la base de datos
      await Cotizacion.findByIdAndUpdate(cotizacionId, { estado: false });
    } catch (error) {
      console.error('Error al cambiar el estado de la cotización:', error);
    }
  }, 48 * 60 * 60 * 1000);
};


// Exportar la función para utilizarla en otros módulos
module.exports = {
	crearCotizacion,
	obtenerCotizaciones,
	obtenerCotizacionPorId,
};
