const { Cotizacion, Cliente, Usuario, Producto } = require("../models"); // Asegúrate de importar el modelo Cotizacion
const mongoose = require("mongoose");

// Función para obtener todas las cotizaciones de la base de datos
const obtenerCotizaciones = async (req, res) => {
	const query = { estado: true };
	const fechaActual = new Date();

	try {
		// Buscar todas las cotizaciones en la base de datos
		let cotizaciones = await Cotizacion.find(query)
			.sort({ fecha: -1 })
			.populate("usuario", "nombre")
			.populate("sucursal", "municipio")
			.populate("cliente")
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

		// Iterar sobre las cotizaciones y verificar la fecha
		for (let i = 0; i < cotizaciones.length; i++) {
			let fechaCotizacion = new Date(cotizaciones[i].fecha);
			let diferenciaDias = Math.floor(
				(fechaActual - fechaCotizacion) / (1000 * 60 * 60 * 24)
			);

			if (diferenciaDias > 7) {
				// Actualizar el estado de la cotización a false
				cotizaciones[i].estado = false;
				await cotizaciones[i].save();
			}
		}

		// Filtrar las cotizaciones con estado true para la respuesta
		cotizaciones = cotizaciones.filter((cotizacion) => cotizacion.estado);

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
			.sort({ fecha: -1 })
			.populate("usuario", "nombre")
			.populate("sucursal", "municipio")
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

const crearCotizacion = async (req, res) => {
	console.log("crearCotizacion");

	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const { clienteId, clienteNombre, nit, ci, productos } = req.body;

		let cliente;

		if (!productos) {
			return res.status(400).json({ message: "Faltan campos requeridos" });
		}

		if (clienteId) {
			cliente = clienteId;
		} else if (clienteNombre && (nit || ci)) {
			const contadorClientes = await Cliente.countDocuments({}).session(
				session
			);
			const nuevoCodigoCliente = `CLIENTE${String(
				contadorClientes + 1
			).padStart(3, "0")}`;

			const nuevoCliente = new Cliente({
				nombre: clienteNombre,
				nit,
				ci,
				codigoCliente: nuevoCodigoCliente,
			});

			await nuevoCliente.save({ session });

			cliente = nuevoCliente._id;
		} else {
			console.log("Error: Información del cliente incompleta");
			return res
				.status(400)
				.json({ message: "Información del cliente incompleta" });
		}

		const usuario = req.usuario._id;
		const sucursal = req.usuario.sucursal._id;
		const total = productos.reduce(
			(acc, producto) => acc + producto.precioTotal,
			0
		);

		const nuevaCotizacion = new Cotizacion({
			usuario,
			cliente,
			nit,
			sucursal,
			productos,
			total,
		});

		await nuevaCotizacion.save();

		await session.commitTransaction();
		session.endSession();

		await nuevaCotizacion
			.populate("usuario", "nombre")
			.populate("sucursal", "municipio")
			.populate("cliente", "nombre nit ci codigoCliente estado")
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

		res.status(201).json(nuevaCotizacion);
		console.log("nuevaCotizacion", nuevaCotizacion);
	} catch (error) {
		console.error("Error en la creación de la cotización:", error);

		await session.abortTransaction();
		session.endSession();

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

		const { productos } = req.body;

		// Verificar que los campos requeridos estén presentes

		if (!productos) {
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

		cotizacion.productos = productos;
		cotizacion.total = total;

		// Guardar los cambios realizados en la cotización

		await cotizacion.save();

		// Poblar los campos necesarios

		await cotizacion
			.populate("usuario", "nombre")
			.populate("sucursal", "municipio")
			.populate("cliente")
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

function generarFechaAleatoria() {
	const hoy = new Date();
	const haceUnAno = new Date();
	haceUnAno.setFullYear(hoy.getFullYear() - 1);
	const diferencia = hoy.getTime() - haceUnAno.getTime();
	const fechaAleatoria = new Date(
		haceUnAno.getTime() + Math.random() * diferencia
	);
	return fechaAleatoria;
}

const simularCotizacionesMasivas = async (req, res) => {
	try {
		console.log("Iniciando simulación de cotizaciones...");
		const usuarioId = req.usuario._id;
		const usuario = await Usuario.findById(usuarioId);

		if (!usuario) {
			console.log("Usuario no encontrado");
			return;
		}

		console.log(`Usuario ID: ${usuarioId}`);
		const sucursalId = usuario.sucursal;
		console.log(`Sucursal ID: ${sucursalId}`);

		const cotizaciones = [];

		for (let i = 0; i < 50; i++) {
			console.log(`Iteración número ${i + 1}`);

			const [clienteAleatorio] = await Cliente.aggregate([
				{ $sample: { size: 1 } },
			]);
			console.log(`Cliente aleatorio seleccionado: ${clienteAleatorio._id}`);

			const randomSize = Math.floor(Math.random() * 5) + 3;
			console.log(`Número aleatorio de productos a seleccionar: ${randomSize}`);

			const randomProductos = await Producto.aggregate([
				{ $sample: { size: randomSize } },
			]);
			console.log("Productos aleatorios seleccionados");

			let productos = [];
			let total = 0;

			randomProductos.forEach((producto) => {
				console.log(`Procesando producto: ${producto._id}`);

				const cantidadPiezas = 0;
				const precioUnitarioPiezas = producto.precioPorUnidad;

				const precioTotalPiezas = cantidadPiezas * precioUnitarioPiezas;

				const cantidadCajas = Math.floor(Math.random() * 10) + 1;

				// Añadiendo variación al precio unitario de las cajas
				const variacionCajas = 0.85 + Math.random() * 0.3; // Variación de -15% a +15%

				const precioUnitarioCajas = producto.precioCaja * variacionCajas;

				const precioTotalCajas = cantidadCajas * precioUnitarioCajas;
				const precioTotal = precioTotalCajas; // Como no estamos manejando piezas

				productos.push({
					producto: producto._id,
					cantidadCajas,
					cantidadPiezas,
					precioUnitarioPiezas,
					precioUnitarioCajas,
					precioTotalPiezas,
					precioTotalCajas,
					precioTotal,
				});

				total += precioTotal;
			});

			console.log("Creando nuevo documento de Cotización...");

			const cotizacion = new Cotizacion({
				usuario: mongoose.Types.ObjectId(usuarioId),
				cliente: mongoose.Types.ObjectId(clienteAleatorio._id),
				sucursal: mongoose.Types.ObjectId(sucursalId),
				fecha: generarFechaAleatoria(),
				vendido: true,
				productos,
				total,
			});

			await cotizacion.save();
			console.log("Cotización guardada con éxito.");

			cotizaciones.push(cotizacion);
		}

		console.log("Todas las cotizaciones han sido creadas y guardadas.");
		res.status(201).json({ cotizaciones });
	} catch (error) {
		console.error("Error: ", error);
		res.status(500).json({ error: "Hubo un error al crear las cotizaciones" });
	}
};




// Exportar la función para utilizarla en otros módulos
module.exports = {
	crearCotizacion,
	obtenerCotizaciones,
	obtenerCotizacionPorId,
	actualizarCotizacion,
	simularCotizacionesMasivas,
};
