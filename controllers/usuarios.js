const { response, request } = require("express");
const bcryptjs = require("bcryptjs");
const mongoose = require("mongoose");
const Usuario = require("../models/usuario");
const { generarJWT } = require("../helpers");

const getUsuarioPorId = async (req = request, res = response) => {
	const { id } = req.params;

	const usuario = await Usuario.findById(id).populate({
		path: "sucursal",
		populate: {
			path: "usuario",
			select: "_id nombre", // Asegúrate de seleccionar solo los campos que necesitas en la respuesta
		},
	});

	if (!usuario) {
		res.status(404).json({
			msg: `No existe un usuario con el id ${id}`,
		});
	} else {
		res.json(usuario);
	}
};

const usuariosGet = async (req = request, res = response) => {
	const query = { estado: true };

	const [total, usuarios] = await Promise.all([
		Usuario.countDocuments(query),
		Usuario.find(query).populate({
			path: "sucursal",
			populate: {
				path: "usuario",
				select: "_id nombre", // Asegúrate de seleccionar solo los campos que necesitas en la respuesta
			},
		}),
	]);

	res.json({
		total,
		usuarios,
	});
};

const usuariosPost = async (req, res = response) => {
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const { nombre, apellido, correo, password, rol, sucursal } = req.body;
		const usuario = new Usuario({
			nombre,
			apellido,
			correo,
			password,
			rol,
			sucursal,
		});

		// Encriptar la contraseña
		const salt = bcryptjs.genSaltSync();
		usuario.password = bcryptjs.hashSync(password, salt);

		// Generar el código de usuario
		const contadorUsuarios = await Usuario.countDocuments({}).session(session);
		const primeraLetraNombre = nombre.charAt(0).toUpperCase();
		const apellidoMayuscula = apellido.toUpperCase();
		const contadorFormateado = String(contadorUsuarios + 1).padStart(3, "0");

		usuario.codigoUsuario = `${primeraLetraNombre}${apellidoMayuscula}${contadorFormateado}`;

		// Guardar en BD
		await usuario.save({ session });

		const usuarioResp = await Usuario.findById(usuario.id)
			.populate({
				path: "sucursal",
				populate: {
					path: "usuario",
					select: "_id nombre apellido",
				},
			})
			.session(session);

		await session.commitTransaction();
		session.endSession();

		res.json(usuarioResp);
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		console.error(error);
		res.status(500).json({
			success: false,
			message: "Error al crear el usuario",
		});
	}
};

const usuariosPut = async (req, res = response) => {
	const { id } = req.params;
	const { _id, password, google, ...resto } = req.body;

	if (password) {
		// Encriptar la contraseña
		const salt = bcryptjs.genSaltSync();
		resto.password = bcryptjs.hashSync(password, salt);
	}

	// Actualizar el usuario
	await Usuario.findByIdAndUpdate(id, resto);

	// Buscar el usuario actualizado y aplicar el populate
	const usuario = await Usuario.findById(id).populate({
		path: "sucursal",
		populate: {
			path: "usuario",
			select: "_id nombre", // Asegúrate de seleccionar solo los campos que necesitas en la respuesta
		},
	});

	res.json(usuario);
};

const usuariosPatch = (req, res = response) => {
	res.json({
		msg: "patch API - usuariosPatch",
	});
};

const usuariosDelete = async (req, res = response) => {
	const { id } = req.params;
	const usuario = await Usuario.findByIdAndUpdate(id, {
		estado: false,
		new: true,
	});

	res.json(usuario);
};

module.exports = {
	usuariosGet,
	usuariosPost,
	usuariosPut,
	usuariosPatch,
	usuariosDelete,
	getUsuarioPorId,
};
