<<<<<<< HEAD
﻿using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/reports")]
public class ReportsController : ControllerBase
=======
﻿using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/reports")]
[Authorize]
    public class ReportsController : ControllerBase
>>>>>>> fb8cb63facb4d8c4b329d0e299279f4ace0da223
{
    [HttpGet("statistics")]
    public IActionResult GetStatistics()
    {
        return Ok(new
        {
            empleadosActivos = 0,
            presentesHoy = 0,
            tardanzasHoy = 0,
            ausenciasHoy = 0
        });
    }
}