const { sendEmail } = require("../Utils/email");
const User = require("../Models/userSchema");
// const generator = require("generate-password");
// const bcrypt = require("bcryptjs");
const Token = require("../Models/tokenSchema");
const { generateRecoveryPasswordToken } = require("../Utils/token");
// const salt = bcrypt.genSaltSync();

const createMembershipForm = async (req, res) => {
    try {
        const formData = req.body.formData;
        const existingMembership = await User.findOne({
            $or: [
                { cpf: formData.cpf },
                { registration: formData.registration },
                { email: formData.email },
                { rg: formData.rg },
            ],
        });

        if (existingMembership) {
            let errorMessage = "Erro: ";
            if (existingMembership.cpf === formData.cpf)
                errorMessage += "CPF já cadastrado. ";
            if (existingMembership.registration === formData.registration)
                errorMessage += "Matrícula já cadastrada. ";
            if (existingMembership.email === formData.email)
                errorMessage += "Email já cadastrado. ";
            if (existingMembership.rg === formData.rg)
                errorMessage += "RG já cadastrado. ";

            return res.status(400).json({ erro: errorMessage.trim() });
        }

        const membership = new User(formData);

        await membership.save();
        return res.status(201).send(membership);
    } catch (error) {
        console.error("Erro ao criar formulário de membro:", error);
        return res.status(500).send({ error });
    }
};

const getMembershipForm = async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { role: null, status: status } : { role: null };
        const membership = await User.find(query);
        return res.status(200).send(membership);
    } catch (error) {
        return res.status(400).send({ error });
    }
};

const getMembershipById = async (req, res) => {
    try {
        const membership = await User.find(req.params.id);
        return res.status(200).send(membership);
    } catch (error) {
        return res.status(400).send({ error });
    }
};

const deleteMembershipForm = async (req, res) => {
    try {
        const membership = await User.findByIdAndDelete(req.params.id);
        if (!membership) {
            return res.status(404).send({ error });
        }
        return res.status(200).send(membership);
    } catch (error) {
        return res.status(400).send({ error });
    }
};

const updateStatusMembership = async (req, res) => {
    try {
        const membership = await User.findById(req.params.id);
        if (!membership) {
            return res.status(404).send({ error });
        }
        membership.status = true;

        await membership.save();

        const token = generateRecoveryPasswordToken(membership._id);

        await Token.findOneAndDelete({ email: membership.email });

        const newToken = new Token({ token: token, email: membership.email });
        await newToken.save();

        let url;
        if (process.env.NODE_ENV === "deployment") {
            url = `https://seu-dominio.com/recuperar-senha/${token}`;
        } else {
            url = `http://localhost:5173/trocar-senha/${token}`;
        }

        const bodyEmail = `Olá ${membership.name},
        <br /><br />
        É um prazer tê-la conosco. O Sentinela oferece uma experiência única em gestão sindical, com suporte e atendimento personalizados.
        <br />
        Para criar uma senha de acesso ao sistema clique: <a href="${url}">Link</a>
        <br /><br />
        Caso tenha dúvidas sobre o acesso à sua conta ou outras questões, entre em contato com nossa equipe de Suporte através do e-mail 
        suporte@sentinela.sindpol.org.br ou pelo telefone (61) 3321-1949. Estamos disponíveis de segunda a sexta-feira
        , das 8h às 12h e das 14h às 18h no horário de Brasília.
        `;

        const sended = await sendEmail(
            membership.email,
            "Solicitação de Membro",
            bodyEmail
        );

        if (!sended) {
            return res.status(500).send({ error: "Falha ao enviar email." });
        }

        return res.status(200).send(membership);
    } catch (error) {
        return res.status(400).send({ error: error });
    }
};

module.exports = {
    createMembershipForm,
    getMembershipForm,
    deleteMembershipForm,
    updateStatusMembership,
    getMembershipById,
};