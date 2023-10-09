//controlador para proveedores

const Proveedor = require("../models/proveedor");
const Producto = require("../models/producto");
const { response } = require("express");

const obtenerProveedores = async (req, res = response) => {
	const { limite = 5, desde = 0 } = req.query;
	const query = { estado: true };
	const [total, proveedores] = await Promise.all([
		Proveedor.countDocuments(query),
		Proveedor.find(query)
			.populate("usuario", "nombre")
			.skip(Number(desde))
			.limit(Number(limite)),
	]);
	res.json({
		total,
		proveedores,
	});
};

const obtenerProveedor = async (req, res = response) => {
	const { id } = req.params;
	const proveedor = await Proveedor.findById(id).populate("usuario", "nombre");
	res.json(proveedor);
};

const crearProveedor = async (req, res = response) => {
	const { estado, usuario, ...body } = req.body;
	const proveedorDB = await Proveedor.findOne({ nombre: body.nombre });
	if (proveedorDB) {
		return res.status(400).json({
			msg: `El proveedor ${proveedorDB.nombre} ya existe`,
		});
	}
	const data = {
		...body,
		nombre: body.nombre,
		usuario: req.usuario._id,
	};
	const proveedor = new Proveedor(data);
	await proveedor.save();
	res.status(201).json(proveedor);
};

const actualizarProveedor = async (req, res = response) => {
	const { id } = req.params;
	const { estado, usuario, ...data } = req.body;
	if (data.nombre) {
		data.nombre = data.nombre.toUpperCase();
	}
	data.usuario = req.usuario._id;
	const proveedor = await Proveedor.findByIdAndUpdate(id, data, { new: true });
	res.json(proveedor);
};

const borrarProveedor = async (req, res = response) => {
	const { id } = req.params;
	const proveedorBorrado = await Proveedor.findByIdAndUpdate(
		id,
		{ estado: false },
		{ new: true }
	);
	res.json(proveedorBorrado);
};

const obtenerProductosProveedor = async (req, res = response) => {
	const { id } = req.params;
	const productos = await Producto.find({ proveedor: id, estado: true });
	res.json(productos);
};

module.exports = {
	obtenerProveedores,
	obtenerProveedor,
	crearProveedor,
	actualizarProveedor,
	borrarProveedor,
	obtenerProductosProveedor,
};
