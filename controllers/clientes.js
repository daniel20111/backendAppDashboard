const { response, request } = require("express");

const { Cliente } = require("../models");

const obtenerClientes = async (req = request, res = response) => {
	try {
		const query = { estado: true };
		const [total, clientes] = await Promise.all([
			Cliente.countDocuments(query),
			Cliente.find(query), // Si necesitas poblar algún campo específico, indícalo en populate('campo')
		]);

		res.json({
			total,
			clientes,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "Error al obtener los clientes",
		});
	}
};

const crearCliente = async (req = request, res = response) => {
	const session = await Cliente.startSession();
	session.startTransaction();

	try {
		const { nombre, nit, ci } = req.body;
		const cliente = new Cliente({ nombre, nit, ci });

		await cliente.save({ session }); // Pasamos la sesión como opción

		await session.commitTransaction(); // Confirmamos la transacción

		res.status(201).json({
			message: "Cliente creado con éxito",
			cliente,
		});
	} catch (error) {
		// Si algo sale mal, deshacemos la transacción
		await session.abortTransaction();

		console.error(error);
		res.status(500).json({
			message: "Error al crear el cliente",
		});
	} finally {
		session.endSession(); // Cerramos la sesión
	}
};

const buscarClientes = async (req = request, res = response) => {
	try {
		const term = req.query.term;
		const regex = new RegExp(term, "i"); // Para buscar de manera insensible a las mayúsculas

		const query = {
			$or: [
				{ nombre: regex },
				{ nit: term }, // Suponiendo que nit y ci son strings con valores numéricos
				{ ci: term },
			],
			estado: true,
		};

		const clientes = await Cliente.find(query);

		res.json({
			clientes,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "Error al buscar los clientes",
		});
	}
};

module.exports = {
	obtenerClientes,
	crearCliente,
	buscarClientes,
};
