-- Enum para tipos de cita
CREATE TYPE public.appointment_type AS ENUM ('presencial', 'virtual');

-- Enum para estados de cita
CREATE TYPE public.appointment_status AS ENUM ('pendiente', 'confirmada', 'cancelada', 'completada');

-- Enum para roles de usuario
CREATE TYPE public.app_role AS ENUM ('medico', 'asistente');

-- Tabla de consultorios
CREATE TABLE public.offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabla de médicos
CREATE TABLE public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    specialty TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabla de horarios disponibles (bloques de tiempo)
CREATE TABLE public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INTEGER DEFAULT 30 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Tabla de bloqueos de horario
CREATE TABLE public.schedule_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT valid_block_range CHECK (start_datetime < end_datetime)
);

-- Tabla de citas
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
    office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    patient_email TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration INTEGER DEFAULT 30 NOT NULL,
    type appointment_type DEFAULT 'presencial' NOT NULL,
    status appointment_status DEFAULT 'pendiente' NOT NULL,
    confirmation_token UUID DEFAULT gen_random_uuid(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT valid_appointment_time CHECK (start_time < end_time)
);

-- Tabla de roles de usuario
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- Tabla de perfiles de usuario
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Función para verificar rol
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_offices_updated_at
    BEFORE UPDATE ON public.offices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at
    BEFORE UPDATE ON public.doctors
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Habilitar RLS
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para offices (lectura pública, escritura autenticada)
CREATE POLICY "Offices are publicly readable"
    ON public.offices FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can manage offices"
    ON public.offices FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Políticas para doctors (lectura pública para agendar)
CREATE POLICY "Doctors are publicly readable"
    ON public.doctors FOR SELECT
    USING (is_active = true);

CREATE POLICY "Authenticated users can manage doctors"
    ON public.doctors FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Políticas para schedules (lectura pública)
CREATE POLICY "Schedules are publicly readable"
    ON public.schedules FOR SELECT
    USING (is_active = true);

CREATE POLICY "Authenticated users can manage schedules"
    ON public.schedules FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Políticas para schedule_blocks
CREATE POLICY "Schedule blocks are publicly readable"
    ON public.schedule_blocks FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can manage schedule blocks"
    ON public.schedule_blocks FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Políticas para appointments
CREATE POLICY "Public can create appointments"
    ON public.appointments FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Patients can view their own appointments by token"
    ON public.appointments FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can manage appointments"
    ON public.appointments FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Políticas para user_roles
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'medico'))
    WITH CHECK (public.has_role(auth.uid(), 'medico'));

-- Políticas para profiles
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Índices para mejorar rendimiento
CREATE INDEX idx_appointments_doctor_date ON public.appointments(doctor_id, appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_confirmation_token ON public.appointments(confirmation_token);
CREATE INDEX idx_schedules_doctor ON public.schedules(doctor_id);
CREATE INDEX idx_schedule_blocks_doctor ON public.schedule_blocks(doctor_id);
CREATE INDEX idx_doctors_office ON public.doctors(office_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);