using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
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
