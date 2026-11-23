// Cue key (lib/cookCues.js) -> bundled MUI icon. Kept apart from CueIcon.jsx
// so that file only exports components.
import EggOutlined from '@mui/icons-material/EggOutlined'
import SetMeal from '@mui/icons-material/SetMeal'
import KebabDining from '@mui/icons-material/KebabDining'
import Tapas from '@mui/icons-material/Tapas'
import Opacity from '@mui/icons-material/Opacity'
import Liquor from '@mui/icons-material/Liquor'
import LocalDrink from '@mui/icons-material/LocalDrink'
import RamenDining from '@mui/icons-material/RamenDining'
import RiceBowl from '@mui/icons-material/RiceBowl'
import BakeryDining from '@mui/icons-material/BakeryDining'
import Cookie from '@mui/icons-material/Cookie'
import WaterDrop from '@mui/icons-material/WaterDrop'
import Hive from '@mui/icons-material/Hive'
import Grass from '@mui/icons-material/Grass'
import Grain from '@mui/icons-material/Grain'
import Spa from '@mui/icons-material/Spa'
import Yard from '@mui/icons-material/Yard'
import Restaurant from '@mui/icons-material/Restaurant'
import ContentCut from '@mui/icons-material/ContentCut'
import Blender from '@mui/icons-material/Blender'
import Cyclone from '@mui/icons-material/Cyclone'
import AddCircleOutlined from '@mui/icons-material/AddCircleOutlined'
import Whatshot from '@mui/icons-material/Whatshot'
import SoupKitchen from '@mui/icons-material/SoupKitchen'
import SoupKitchenOutlined from '@mui/icons-material/SoupKitchenOutlined'
import LocalFireDepartment from '@mui/icons-material/LocalFireDepartment'
import Microwave from '@mui/icons-material/Microwave'
import OutdoorGrill from '@mui/icons-material/OutdoorGrill'
import FilterAlt from '@mui/icons-material/FilterAlt'
import PanTool from '@mui/icons-material/PanTool'
import AcUnit from '@mui/icons-material/AcUnit'
import HourglassBottom from '@mui/icons-material/HourglassBottom'
import Countertops from '@mui/icons-material/Countertops'
import DinnerDiningOutlined from '@mui/icons-material/DinnerDiningOutlined'
import DeviceThermostat from '@mui/icons-material/DeviceThermostat'
import TimerOutlined from '@mui/icons-material/TimerOutlined'
import Visibility from '@mui/icons-material/Visibility'

export const CUE_ICONS = {
  // ingredients
  egg: EggOutlined, seafood: SetMeal, poultry: KebabDining, meat: KebabDining, legume: Tapas, oil: Opacity, sauce: Liquor,
  dairy: LocalDrink, pasta: RamenDining, grain: RiceBowl, bread: BakeryDining, sweet: Cookie, liquid: WaterDrop, nut: Hive,
  herb: Grass, spice: Grain, fruit: Spa, vegetable: Yard, ingredient: Restaurant,
  // actions
  cut: ContentCut, blend: Blender, mix: Cyclone, add: AddCircleOutlined, heat: Whatshot, boil: SoupKitchen, fry: LocalFireDepartment,
  cook: Whatshot, bake: Microwave, grill: OutdoorGrill, season: Grain, drain: FilterAlt, knead: PanTool, chill: AcUnit, rest: HourglassBottom, serve: Restaurant,
  // tools
  pan: Countertops, pot: SoupKitchenOutlined, oven: Microwave, bowl: DinnerDiningOutlined, blender: Blender, thermometer: DeviceThermostat,
  // states
  'heat-level': Whatshot, timer: TimerOutlined, doneness: Visibility, temp: DeviceThermostat,
}
