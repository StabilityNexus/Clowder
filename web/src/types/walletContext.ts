export interface WalletContextProps {
    address: string;
    isLoading: boolean;
    balance: string;
    connect: () => void;
    disconnect: () => void;
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    catsContractInstance?: any;
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    catsContractFactoryInstance?: any;
}
