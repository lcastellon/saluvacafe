export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      insumos: {
        Row: {
          activo: boolean
          costo_unitario: number
          created_at: string
          existencia: number
          id: string
          minimo: number
          nombre: string
          proveedor: string
          unidad: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          costo_unitario?: number
          created_at?: string
          existencia?: number
          id?: string
          minimo?: number
          nombre: string
          proveedor?: string
          unidad: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          costo_unitario?: number
          created_at?: string
          existencia?: number
          id?: string
          minimo?: number
          nombre?: string
          proveedor?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: []
      }
      perfiles: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          id: string
          nombre: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      pos_cajas: {
        Row: {
          abierto_en: string
          abierto_por: string
          abierto_por_nombre: string
          cerrado_en: string | null
          cerrado_por: string | null
          cerrado_por_nombre: string | null
          efectivo_contado: number | null
          estado: string
          fondo_inicial: number
          id: string
          notas_cierre: string | null
          sucursal_id: string
          terminal_id: string
        }
        Insert: {
          abierto_en?: string
          abierto_por: string
          abierto_por_nombre: string
          cerrado_en?: string | null
          cerrado_por?: string | null
          cerrado_por_nombre?: string | null
          efectivo_contado?: number | null
          estado?: string
          fondo_inicial?: number
          id?: string
          notas_cierre?: string | null
          sucursal_id: string
          terminal_id: string
        }
        Update: {
          abierto_en?: string
          abierto_por?: string
          abierto_por_nombre?: string
          cerrado_en?: string | null
          cerrado_por?: string | null
          cerrado_por_nombre?: string | null
          efectivo_contado?: number | null
          estado?: string
          fondo_inicial?: number
          id?: string
          notas_cierre?: string | null
          sucursal_id?: string
          terminal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_cajas_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "pos_sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_cajas_terminal_id_fkey"
            columns: ["terminal_id"]
            isOneToOne: false
            referencedRelation: "pos_terminales"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_configuracion: {
        Row: {
          actualizado_en: string
          actualizado_por: string | null
          direccion: string
          horario: string
          id: string
          iva: number
          moneda: string
          nombre: string
          propina_sugerida: number
          sucursal: string
          telefono: string
        }
        Insert: {
          actualizado_en?: string
          actualizado_por?: string | null
          direccion: string
          horario: string
          id?: string
          iva: number
          moneda: string
          nombre: string
          propina_sugerida: number
          sucursal: string
          telefono: string
        }
        Update: {
          actualizado_en?: string
          actualizado_por?: string | null
          direccion?: string
          horario?: string
          id?: string
          iva?: number
          moneda?: string
          nombre?: string
          propina_sugerida?: number
          sucursal?: string
          telefono?: string
        }
        Relationships: []
      }
      pos_notas_turno: {
        Row: {
          actualizada_en: string
          color: number
          creada_en: string
          creada_por: string
          hecha: boolean
          id: string
          texto: string
        }
        Insert: {
          actualizada_en?: string
          color?: number
          creada_en?: string
          creada_por?: string
          hecha?: boolean
          id?: string
          texto: string
        }
        Update: {
          actualizada_en?: string
          color?: number
          creada_en?: string
          creada_por?: string
          hecha?: boolean
          id?: string
          texto?: string
        }
        Relationships: []
      }
      pos_sucursales: {
        Row: {
          activa: boolean
          creada_en: string
          creada_por: string | null
          direccion: string
          id: string
          nombre: string
        }
        Insert: {
          activa?: boolean
          creada_en?: string
          creada_por?: string | null
          direccion?: string
          id?: string
          nombre: string
        }
        Update: {
          activa?: boolean
          creada_en?: string
          creada_por?: string | null
          direccion?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      pos_terminales: {
        Row: {
          activa: boolean
          autorizada_en: string
          autorizada_por: string
          id: string
          nombre: string
          sucursal_id: string
          token_hash: string
          ultimo_uso_en: string
        }
        Insert: {
          activa?: boolean
          autorizada_en?: string
          autorizada_por: string
          id?: string
          nombre: string
          sucursal_id: string
          token_hash: string
          ultimo_uso_en?: string
        }
        Update: {
          activa?: boolean
          autorizada_en?: string
          autorizada_por?: string
          id?: string
          nombre?: string
          sucursal_id?: string
          token_hash?: string
          ultimo_uso_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_terminales_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "pos_sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_venta_items: {
        Row: {
          cantidad: number
          id: string
          linea_id: string
          nombre: string
          opciones: Json
          precio: number
          producto_id: string
          venta_id: string
        }
        Insert: {
          cantidad: number
          id?: string
          linea_id: string
          nombre: string
          opciones?: Json
          precio: number
          producto_id: string
          venta_id: string
        }
        Update: {
          cantidad?: number
          id?: string
          linea_id?: string
          nombre?: string
          opciones?: Json
          precio?: number
          producto_id?: string
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_venta_items_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "pos_ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_ventas: {
        Row: {
          actualizado_en: string
          caja_id: string | null
          cambio: number
          canal: string
          client_id: string
          cliente: string
          comensales: number
          creado_en: string
          estado: string
          folio: string
          id: string
          iva: number
          metodo_pago: string
          monto_recibido: number
          propina: number
          subtotal: number
          total: number
          user_id: string
        }
        Insert: {
          actualizado_en?: string
          caja_id?: string | null
          cambio?: number
          canal: string
          client_id: string
          cliente?: string
          comensales?: number
          creado_en: string
          estado: string
          folio: string
          id?: string
          iva: number
          metodo_pago: string
          monto_recibido?: number
          propina?: number
          subtotal: number
          total: number
          user_id: string
        }
        Update: {
          actualizado_en?: string
          caja_id?: string | null
          cambio?: number
          canal?: string
          client_id?: string
          cliente?: string
          comensales?: number
          creado_en?: string
          estado?: string
          folio?: string
          id?: string
          iva?: number
          metodo_pago?: string
          monto_recibido?: number
          propina?: number
          subtotal?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_ventas_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "pos_cajas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      abrir_caja_pos: {
        Args: { p_fondo_inicial: number; p_token: string }
        Returns: Json
      }
      autorizar_terminal_pos: {
        Args: { p_nombre: string; p_sucursal_id: string; p_token: string }
        Returns: Json
      }
      cerrar_caja_pos: {
        Args: { p_efectivo_contado: number; p_notas?: string; p_token: string }
        Returns: Json
      }
      crear_sucursal_pos: {
        Args: { p_direccion?: string; p_nombre: string }
        Returns: Json
      }
      estado_terminal_caja: { Args: { p_token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      listar_sucursales_pos: { Args: never; Returns: Json }
      listar_ventas_pos: { Args: never; Returns: Json }
      reporte_periodo_pos: {
        Args: { p_desde: string; p_hasta: string; p_sucursal_id?: string }
        Returns: Json
      }
      sincronizar_venta_pos: { Args: { p_venta: Json }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "barista"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "barista"],
    },
  },
} as const
