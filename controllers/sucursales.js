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
		const { municipio, direccion, categoria } = req.body;

		let codigoSucursal;

		if (categoria === "CASA MATRIZ") {
			codigoSucursal = 0;
		} else if (categoria === "SUCURSAL") {
			const countSucursal = await Sucursal.countDocuments({
				categoria: "SUCURSAL",
			});
			codigoSucursal = countSucursal + 1;
		}

		const data = {
			municipio,
			direccion,
			categoria,
			codigoSucursal, // Campo agregado
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

const crearPuntoVenta = async (req, res) => {
	try {
		const { id } = req.params; // ID de la sucursal

		// Buscar la sucursal por ID
		const sucursal = await Sucursal.findById(id);
		if (!sucursal) {
			return res.status(404).json({
				message: "Sucursal no encontrada",
			});
		}

		// La dirección del punto de venta es igual a la dirección de la sucursal
		const direccion = sucursal.direccion;

		// El código del punto de venta es igual a contar los puntos de venta de dicha sucursal + 1
		const codigo = sucursal.puntosDeVenta
			? sucursal.puntosDeVenta.length + 1
			: 1;

		// Crear el objeto del punto de venta
		const puntoVenta = { codigo, direccion };

		// Añadir el punto de venta a la sucursal
		sucursal.puntosDeVenta.push(puntoVenta);

		// Guardar la sucursal con el nuevo punto de venta
		await sucursal.save();

		res.status(201).json({
			message: "Punto de venta creado con éxito",
			puntoVenta,
			sucursal,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "Error al crear el punto de venta",
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
	crearPuntoVenta,
};
