#define ABRT 0x04;

DWORD64 PciBaseAddressUEFI();
int baseAddress;
void ReadNativeMaxAddressExt(WORD baseAddressCommand,
                            WORD baseAddressControl,
                            bool unitNumber) {
    printf("");
}


DWORD determinateBaseAddreses(int busNumber,
                              int deviceNumber,
                              int functionNumber,
                              bool channel) {
    if (channel == 0) {
     //return primary channel addrresses
    } else if (channel == 1) {
        //return secondary channel addresses
    }
}

void ExecuteDeviceDiagnostic(WORD baseAddressCommand) {
    if (__outp(ERROR) & ABRT == 1)
}

int main() {
    baseAddress = PciBaseAddressUEFI();
    if (baseAddress == 0) {
        return -1;
    }


    return 0;
}