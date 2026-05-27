import Empresa from '../models/empresaModel.js';
import { validarRUT, formatearRUT } from '../utils/rutValidator.js';

class EmpresaController {
    
    static async createEmpresa(req, res) {
        try {
            const { rut, razonSocial, direccion, telefono, emailContacto, rubro,
                    convenioNumero, convenioFechaInicio, convenioFechaTermino, convenioEstado } = req.body;
            const tenantId = req.user.tenantId;

            if (!rut || !razonSocial) {
                return res.status(400).json({ message: 'RUT y Razón Social son obligatorios' });
            }

            if (!validarRUT(rut)) {
                return res.status(400).json({ message: 'El RUT de la empresa no es válido.' });
            }

            const rutFormateado = formatearRUT(rut);

            const existing = await Empresa.findOne({ rut: rutFormateado, tenantId });
            if (existing) {
                return res.status(409).json({ message: 'Ya existe una empresa con este RUT en la institución.' });
            }

            const empresa = await Empresa.create({
                tenantId,
                rut: rutFormateado,
                razonSocial,
                direccion,
                telefono,
                emailContacto,
                rubro,
                convenioNumero,
                convenioFechaInicio,
                convenioFechaTermino,
                convenioEstado
            });

            res.status(201).json(empresa);
        } catch (error) {
            if (error.code === 11000) {
                return res.status(400).json({ message: 'La empresa ya existe (RUT duplicado).' });
            }
            res.status(500).json({ message: error.message });
        }
    }

    static async getEmpresas(req, res) {
        try {
            const empresas = await Empresa.find({ tenantId: req.user.tenantId }).sort({ razonSocial: 1 });
            res.status(200).json(empresas);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async updateEmpresa(req, res) {
        try {
            const { id } = req.params;
            const updateData = { ...req.body };
            
            if (updateData.rut) {
                if (!validarRUT(updateData.rut)) {
                    return res.status(400).json({ message: 'El RUT no es válido.' });
                }
                updateData.rut = formatearRUT(updateData.rut);
            }

            const empresa = await Empresa.findOneAndUpdate(
                { _id: id, tenantId: req.user.tenantId },
                updateData,
                { new: true }
            );

            if (!empresa) {
                return res.status(404).json({ message: 'Empresa no encontrada.' });
            }

            res.status(200).json(empresa);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async deleteEmpresa(req, res) {
        try {
            const { id } = req.params;
            
            // Aquí podríamos añadir verificaciones pre-eliminación (ej: no eliminar si tiene Alternancias activas)
            // Para simplicidad por ahora lo permitimos

            const empresa = await Empresa.findOneAndDelete({ _id: id, tenantId: req.user.tenantId });
            if (!empresa) {
                return res.status(404).json({ message: 'Empresa no encontrada.' });
            }

            res.status(200).json({ message: 'Empresa eliminada exitosamente.' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default EmpresaController;
