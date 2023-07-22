const { response, request } = require("express");
const bcryptjs = require("bcryptjs");

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
	const { nombre, correo, password, rol } = req.body;
	const usuario = new Usuario({ nombre, correo, password, rol });

	// Encriptar la contraseña
	const salt = bcryptjs.genSaltSync();
	usuario.password = bcryptjs.hashSync(password, salt);

	// Guardar en BD
	await usuario.save();

	const usuarioResp = await Usuario.findById(usuario.id).populate({
		path: "sucursal",
		populate: {
			path: "usuario",
			select: "_id nombre", // Asegúrate de seleccionar solo los campos que necesitas en la respuesta
		},
	});

	res.json(usuarioResp);
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
