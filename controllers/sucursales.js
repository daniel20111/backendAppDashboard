const { response } = require("express");
const { Sucursal } = require("../models");

const obtenerSucursales = async (req, res = response) => {
	//const { limite = 10, desde = 0 } = req.query;
	const query = { estado: true };

	const [total, sucursales] = await Promise.all([
		Sucursal.countDocuments(query),
		Sucursal.find(query).populate("usuario", "nombre"),
		//.skip(Number(desde))
		//.limit(Number(limite)),
	]);

	res.json({
		total,
		sucursales,
	});
};

const obtenerSucursal = async (req, res = response) => {
	const { id } = req.params;
	const sucursal = await Sucursal.findById(id).populate("usuario", "nombre");

	res.json(sucursal);
};

const crearSucursal = async (req, res = response) => {
	const { definicion, direccion, categoria } = req.body;

	// Generar la data a guardar
	const data = {
		definicion,
		direccion,
		categoria,
		usuario: req.usuario._id,
	};

	const sucursal = new Sucursal(data);

	// Guardar DB
	await sucursal.save();

	await sucursal.populate("usuario", "nombre").execPopulate();

	res.status(201).json(sucursal);
};

const actualizarSucursal = async (req, res = response) => {
	const { id } = req.params;
	const { estado, usuario, ...data } = req.body;

	data.usuario = req.usuario._id;

	const sucursal = await Sucursal.findByIdAndUpdate(id, data, { new: true });

	res.json(sucursal);
};

const borrarSucursal = async (req, res = response) => {
	const { id } = req.params;
	const sucursalBorrada = await Sucursal.findByIdAndUpdate(
		id,
		{ estado: false },
		{ new: true }
	);

	res.json(sucursalBorrada);
};

module.exports = {
	crearSucursal,
	obtenerSucursal,
	obtenerSucursales,
	actualizarSucursal,
	borrarSucursal,
};
