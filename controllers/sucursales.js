const { response } = require("express");
const { Sucursal } = require("../models");

const obtenerSucursales = async (req, res = response) => {
	try {
		const query = { estado: true };

		const [total, sucursales] = await Promise.all([
			Sucursal.countDocuments(query),
			Sucursal.find(query).populate("usuario", "nombre"),
		]);

		res.json({
			total,
			sucursales,
		});
	} catch (error) {
		res.status(500).json({
			message: "Error al obtener sucursales",
			error,
		});
	}
};

const obtenerSucursal = async (req, res = response) => {
	try {
		const { id } = req.params;
		const sucursal = await Sucursal.findById(id).populate("usuario", "nombre");

		res.json(sucursal);
	} catch (error) {
		res.status(500).json({
			message: "Error al obtener sucursal",
			error,
		});
	}
};

const crearSucursal = async (req, res = response) => {
	try {
		const { definicion, direccion, categoria } = req.body;

		const data = {
			definicion,
			direccion,
			categoria,
			usuario: req.usuario._id,
		};

		const sucursal = new Sucursal(data);

		await sucursal.save();
		await sucursal.populate("usuario", "nombre").execPopulate();

		res.status(201).json(sucursal);
	} catch (error) {
		res.status(500).json({
			message: "Error al crear sucursal",
			error,
		});
	}
};

const actualizarSucursal = async (req, res = response) => {
	try {
		const { id } = req.params;
		const { estado, usuario, ...data } = req.body;

		data.usuario = req.usuario._id;

		const sucursal = await Sucursal.findByIdAndUpdate(id, data, { new: true });

		res.json(sucursal);
	} catch (error) {
		res.status(500).json({
			message: "Error al actualizar sucursal",
			error,
		});
	}
};

const borrarSucursal = async (req, res = response) => {
	try {
		const { id } = req.params;
		const sucursalBorrada = await Sucursal.findByIdAndUpdate(
			id,
			{ estado: false },
			{ new: true }
		);

		res.json(sucursalBorrada);
	} catch (error) {
		res.status(500).json({
			message: "Error al borrar sucursal",
			error,
		});
	}
};

module.exports = {
	crearSucursal,
	obtenerSucursal,
	obtenerSucursales,
	actualizarSucursal,
	borrarSucursal,
};
