export type Room = 'ITN1' | 'ITN2' | 'ITN3';

export interface Rack {
    id: number;
    Salle: Room | string;
    Rack: string;
    Rangée: string;
    Num_Rack: string;
    Designation: string;
    Porteur: string;
    Dimensions: string;
    Largeur_mm: number;
    Alimentation: string;
    Phase: string;
    PDU: string;
    Puissance_PDU: number;
    Moyenne_Capacitaire_Rack: number;
    Canalis_Redresseur_Voie1: string;
    Canalis_Redresseur_Voie2: string;
    P_Voie1_Ph1: number;
    P_Voie1_Ph2: number;
    P_Voie1_Ph3: number;
    P_Voie1_DC: number;
    P_Voie2_Ph1: number;
    P_Voie2_Ph2: number;
    P_Voie2_Ph3: number;
    P_Voie2_DC: number;
}

export interface OtherConsumersState {
    acP1: number;
    acP2: number;
    acP3: number;
    dc: number;
}

export type OtherConsumersStateMap = {
    A: OtherConsumersState;
    B: OtherConsumersState;
    C: OtherConsumersState;
};

export interface Capacities {
    UPS_A_kW: number;
    UPS_B_kW: number;
    UPS_C_kW: number;
    ROOM_CAPACITY_ITN1_kW: number;
    ROOM_CAPACITY_ITN2_kW: number;
    ROOM_CAPACITY_ITN3_kW: number;
    ROW_AC_CAPACITY_kW: number;
    ROW_DC_CAPACITY_kW: number;
}